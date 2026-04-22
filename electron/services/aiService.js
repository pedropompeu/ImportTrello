/**
 * aiService.js — Motor de IA com suporte a múltiplos providers.
 *
 * Padrão: Strategy Pattern.
 * Cada provider implementa a mesma interface: { generate(prompt, apiKey, model, baseUrl) }
 * Para adicionar um novo provider no futuro: criar uma nova strategy e registrar em PROVIDERS.
 */

const https = require('https')
const http  = require('http')

// ─── System Prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Você é um assistente especialista em gestão de projetos.
Sua única função é transformar textos em listas estruturadas de tarefas para o Trello.

REGRAS OBRIGATÓRIAS:
1. Retorne APENAS um JSON válido — sem markdown, sem explicações, sem blocos de código.
2. O JSON deve ter a estrutura: { "sprints": [ { "label": "Sprint X", "titulo": "...", "tasks": [...] } ] }
3. Cada task deve ter: { "titulo", "tipo", "desc_limpa", "checkItems", "destino_col", "due_date" }
4. Valores válidos para "tipo": Backend | Frontend | Infra / Config | Testes | Docs | Mobile | DevOps
5. Valores válidos para "destino_col": Backlog | A Fazer | Em Progresso | Em Revisão | Em Espera | Concluído
6. "checkItems" deve ser um array de strings (passos concretos e acionáveis)
7. "due_date" deve ser null ou uma data ISO no futuro (YYYY-MM-DD)
8. Agrupe tasks logicamente em sprints/fases. Crie quantas sprints fizerem sentido.
9. Seja específico e técnico. Não gere tarefas genéricas.
10. Mínimo de 3 checkItems por task, máximo de 8.`

// ─── HTTP helper ──────────────────────────────────────────────────────────────
function httpPost(url, headers, body) {
  return new Promise((resolve, reject) => {
    const parsed  = new URL(url)
    const lib     = parsed.protocol === 'https:' ? https : http
    const payload = JSON.stringify(body)

    const req = lib.request({
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method:   'POST',
      headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload), ...headers },
    }, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(data)) } catch { resolve(data) }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 300)}`))
        }
      })
    })
    req.on('error', reject)
    req.write(payload)
    req.end()
  })
}

// ─── Strategies ──────────────────────────────────────────────────────────────

const openaiStrategy = {
  name: 'OpenAI',
  async generate({ prompt, apiKey, model, baseUrl }) {
    const url = (baseUrl || 'https://api.openai.com') + '/v1/chat/completions'
    const res = await httpPost(url, { Authorization: `Bearer ${apiKey}` }, {
      model: model || 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: prompt },
      ],
      temperature:      0.3,
      response_format: { type: 'json_object' },
    })
    const text = res.choices?.[0]?.message?.content || ''
    return parseAiResponse(text)
  },
}

const anthropicStrategy = {
  name: 'Anthropic',
  async generate({ prompt, apiKey, model }) {
    const res = await httpPost('https://api.anthropic.com/v1/messages', {
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
    }, {
      model:      model || 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: 'user', content: prompt }],
    })
    const text = res.content?.[0]?.text || ''
    return parseAiResponse(text)
  },
}

const geminiStrategy = {
  name: 'Gemini',
  async generate({ prompt, apiKey, model }) {
    const m   = model || 'gemini-1.5-pro'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`
    const res = await httpPost(url, {}, {
      contents: [{ role: 'user', parts: [{ text: SYSTEM_PROMPT + '\n\n' + prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.3 },
    })
    const text = res.candidates?.[0]?.content?.parts?.[0]?.text || ''
    return parseAiResponse(text)
  },
}

// Provider customizado compatível com OpenAI (Ollama, LM Studio, etc.)
const customStrategy = {
  name: 'Custom (OpenAI-compat)',
  async generate({ prompt, apiKey, model, baseUrl }) {
    if (!baseUrl) throw new Error('baseUrl é obrigatório para providers customizados')
    return openaiStrategy.generate({ prompt, apiKey, model, baseUrl })
  },
}

// ─── Registry ────────────────────────────────────────────────────────────────
const PROVIDERS = {
  openai:     openaiStrategy,
  anthropic:  anthropicStrategy,
  gemini:     geminiStrategy,
  custom:     customStrategy,
}

// Detecta automaticamente o provider pelo nome salvo no banco
function detectProvider(name = '') {
  const lower = name.toLowerCase()
  if (lower.includes('openai') || lower.includes('gpt')) return 'openai'
  if (lower.includes('anthropic') || lower.includes('claude')) return 'anthropic'
  if (lower.includes('gemini') || lower.includes('google')) return 'gemini'
  return 'custom'
}

// ─── Parser de resposta ───────────────────────────────────────────────────────
function parseAiResponse(text) {
  // Remove possíveis blocos markdown que alguns modelos insistem em adicionar
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  try {
    const parsed = JSON.parse(clean)
    // Normaliza para sempre ter o formato { sprints: [...] }
    if (Array.isArray(parsed)) return { sprints: parsed }
    if (parsed.sprints) return parsed
    if (parsed.tasks)   return { sprints: [{ label: 'Sprint 1', titulo: 'Tarefas Geradas', tasks: parsed.tasks }] }
    return { sprints: [{ label: 'Sprint 1', titulo: 'Tarefas Geradas', tasks: [parsed] }] }
  } catch (e) {
    throw new Error(`Falha ao parsear JSON da IA: ${e.message}\n\nResposta bruta: ${text.slice(0, 500)}`)
  }
}

// ─── Função principal ─────────────────────────────────────────────────────────
async function generateTasksFromText({ text, provider }) {
  const providerKey = detectProvider(provider.name)
  const strategy    = PROVIDERS[providerKey]

  if (!strategy) throw new Error(`Provider desconhecido: ${provider.name}`)
  if (!provider.api_key) throw new Error(`API Key não configurada para ${provider.name}`)

  const prompt = `Analise o seguinte texto e gere tarefas estruturadas para o Trello:

---
${text}
---

Retorne o JSON com as tarefas organizadas em sprints/fases que façam sentido para este projeto.`

  return strategy.generate({
    prompt,
    apiKey:  provider.api_key,
    model:   provider.model,
    baseUrl: provider.base_url,
  })
}

// Validação de API key
async function validateAiKey({ provider }) {
  try {
    const result = await generateTasksFromText({
      text:     'Crie apenas 1 task de exemplo para testar a conexão: "Tarefa de teste".',
      provider,
    })
    return { ok: true, taskCount: result.sprints?.reduce((s, sp) => s + sp.tasks.length, 0) || 0 }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

module.exports = { generateTasksFromText, validateAiKey, PROVIDERS, detectProvider }
