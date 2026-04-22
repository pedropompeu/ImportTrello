/**
 * parserService.js — Engine de parsing multiformato.
 *
 * Padrão: Factory Method.
 * parseFile(filePath) detecta automaticamente o formato e usa o parser correto.
 * Para adicionar um novo formato: registrar em PARSERS com a extensão.
 *
 * Saída normalizada de todos os parsers:
 * { sprints: [ { label, titulo, tasks: [ { titulo, tipo, desc_limpa, checkItems, due_date, links } ] } ] }
 */

const fs   = require('fs')
const path = require('path')

// ─── Schema de normalização ───────────────────────────────────────────────────
const VALID_TIPOS    = ['Backend', 'Frontend', 'Infra / Config', 'Testes', 'Docs', 'Mobile', 'DevOps']
const VALID_DESTINOS = ['Backlog', 'A Fazer', 'Em Progresso', 'Em Revisão', 'Em Espera', 'Concluído']

function normalizeTask(raw, defaults = {}) {
  return {
    titulo:      String(raw.titulo || raw.title || raw.name || raw.tarefa || 'Sem título').trim(),
    tipo:        VALID_TIPOS.includes(raw.tipo || raw.type || raw.label) ? (raw.tipo || raw.type || raw.label) : (defaults.tipo || 'Backend'),
    desc_limpa:  String(raw.desc_limpa || raw.desc || raw.description || raw.descricao || '').trim(),
    destino_col: VALID_DESTINOS.includes(raw.destino_col || raw.destino || raw.column) ? (raw.destino_col || raw.destino || raw.column) : 'Backlog',
    due_date:    raw.due_date || raw.prazo || raw.deadline || null,
    checkItems:  normalizeCheckItems(raw.checkItems || raw.checklist || raw.check_items || raw.tasks || []),
    links:       normalizeLinks(raw.links || raw.attachments || []),
    sprint:      String(raw.sprint || defaults.sprint || '').trim(),
    sprint_title: String(raw.sprint_title || raw.sprintTitulo || defaults.sprint_title || '').trim(),
  }
}

function normalizeCheckItems(items) {
  if (!items) return []
  if (typeof items === 'string') {
    // Suporta strings separadas por \n, ; ou ,
    return items.split(/[\n;,]/).map(s => s.trim()).filter(Boolean)
  }
  if (Array.isArray(items)) return items.map(i => typeof i === 'string' ? i.trim() : String(i.text || i.name || i)).filter(Boolean)
  return []
}

function normalizeLinks(links) {
  if (!links) return []
  if (typeof links === 'string') {
    return links.split(/[\n;,]/).map(v => v.trim()).filter(Boolean).map(v => ({ type: 'url', label: '', value: v }))
  }
  if (Array.isArray(links)) {
    return links.map(l => typeof l === 'string'
      ? { type: 'url', label: '', value: l }
      : { type: l.type || 'url', label: l.label || l.name || '', value: l.value || l.url || l.path || '' }
    ).filter(l => l.value)
  }
  return []
}

function wrapInSprints(tasks) {
  // Se as tasks já têm sprint definido, agrupa por sprint
  const grouped = {}
  tasks.forEach(t => {
    const key = t.sprint || 'Geral'
    if (!grouped[key]) grouped[key] = { label: key, titulo: t.sprint_title || key, tasks: [] }
    grouped[key].tasks.push(t)
  })
  return Object.values(grouped)
}

// ─── Parser JSON ──────────────────────────────────────────────────────────────
function parseJSON(content) {
  const raw = JSON.parse(content)

  // Formato 1: { sprints: [...] }  — formato nativo do app
  if (raw.sprints) {
    return {
      sprints: raw.sprints.map(s => ({
        label:  s.label || s.sprint || 'Sprint',
        titulo: s.titulo || s.title || s.label || '',
        tasks:  (s.tasks || []).map(t => normalizeTask(t, { sprint: s.label, sprint_title: s.titulo })),
      })),
    }
  }

  // Formato 2: array direto de tasks
  if (Array.isArray(raw)) {
    const tasks = raw.map(t => normalizeTask(t))
    return { sprints: wrapInSprints(tasks) }
  }

  // Formato 3: { tasks: [...] }
  if (raw.tasks) {
    const tasks = raw.tasks.map(t => normalizeTask(t))
    return { sprints: wrapInSprints(tasks) }
  }

  throw new Error('Formato JSON não reconhecido. Esperado: { sprints: [...] } ou array de tasks.')
}

// ─── Parser CSV ───────────────────────────────────────────────────────────────
function parseCSV(content) {
  // PapaParse não está disponível no main process — implementação manual leve
  const lines   = content.trim().split('\n')
  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))

  const tasks = lines.slice(1)
    .filter(l => l.trim())
    .map(line => {
      const values = parseCSVLine(line)
      const obj    = {}
      headers.forEach((h, i) => { obj[h] = (values[i] || '').trim() })

      // Suporte a coluna "checklist" como string separada por ";"
      if (obj.checklist) obj.checkItems = obj.checklist.split(';').map(s => s.trim()).filter(Boolean)

      return normalizeTask(obj)
    })

  return { sprints: wrapInSprints(tasks) }
}

function parseCSVLine(line) {
  const result = []
  let current  = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

// ─── Parser Excel ─────────────────────────────────────────────────────────────
function parseExcel(buffer) {
  let XLSX
  try { XLSX = require('xlsx') } catch {
    throw new Error('Biblioteca xlsx não instalada. Execute: npm install xlsx')
  }

  const workbook  = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  const sheet     = workbook.Sheets[sheetName]
  const rows      = XLSX.utils.sheet_to_json(sheet, { defval: '' })

  // Normaliza headers para lowercase com underscore
  const tasks = rows.map(row => {
    const normalized = {}
    Object.keys(row).forEach(k => { normalized[k.toLowerCase().replace(/\s+/g, '_')] = row[k] })
    if (normalized.checklist) normalized.checkItems = String(normalized.checklist).split(';').map(s => s.trim()).filter(Boolean)
    return normalizeTask(normalized)
  })

  return { sprints: wrapInSprints(tasks) }
}

// ─── Factory principal ────────────────────────────────────────────────────────
const PARSERS = {
  '.json': (content) => parseJSON(content),
  '.csv':  (content) => parseCSV(content),
  '.xlsx': (_, buffer) => parseExcel(buffer),
  '.xls':  (_, buffer) => parseExcel(buffer),
}

function parseFile(filePath) {
  const ext     = path.extname(filePath).toLowerCase()
  const parser  = PARSERS[ext]

  if (!parser) throw new Error(`Formato não suportado: ${ext}. Formatos aceitos: ${Object.keys(PARSERS).join(', ')}`)

  const buffer  = fs.readFileSync(filePath)
  const content = buffer.toString('utf-8')

  return parser(content, buffer)
}

// Versão para conteúdo já em memória (drag-and-drop)
function parseContent(ext, content, buffer) {
  const parser = PARSERS[ext.toLowerCase()]
  if (!parser) throw new Error(`Formato não suportado: ${ext}`)
  return parser(content, buffer)
}

// Gera template de CSV para download
function generateCSVTemplate() {
  const headers = ['titulo', 'tipo', 'sprint', 'sprint_title', 'desc_limpa', 'destino_col', 'due_date', 'checklist', 'links']
  const example = [
    'CARD 1.1 - Setup do banco',
    'Backend',
    'Sprint 1',
    'Fundação',
    'Configura o banco de dados inicial',
    'Backlog',
    '',
    'Criar docker-compose;Configurar Prisma;Criar migrations',
    'https://github.com/repo',
  ]
  return [headers.join(','), example.join(',')].join('\n')
}

// Gera template de JSON para download
function generateJSONTemplate() {
  return JSON.stringify({
    sprints: [
      {
        label:  'Sprint 1',
        titulo: 'Nome da Sprint',
        tasks: [
          {
            titulo:      'CARD 1.1 — [TIPO] Nome da tarefa',
            tipo:        'Backend',
            desc_limpa:  'Descrição detalhada da tarefa.',
            destino_col: 'Backlog',
            due_date:    null,
            checkItems: ['Passo 1', 'Passo 2', 'Passo 3'],
            links:       [{ type: 'url', label: 'Referência', value: 'https://...' }],
          },
        ],
      },
    ],
  }, null, 2)
}

module.exports = { parseFile, parseContent, generateCSVTemplate, generateJSONTemplate, normalizeTask }
