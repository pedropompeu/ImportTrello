import { useState } from 'react'
import { useAppStore } from '../../../store/store.jsx'
import { Btn, Input, SectionLabel, Divider, Spinner, EmptyState } from '../../ui/index.jsx'

const PROVIDER_PRESETS = [
  { name: 'OpenAI',    model: 'gpt-4o',                        placeholder: 'sk-...',    base_url: '' },
  { name: 'Anthropic', model: 'claude-sonnet-4-20250514',       placeholder: 'sk-ant-...', base_url: '' },
  { name: 'Gemini',    model: 'gemini-1.5-pro',                 placeholder: 'AIza...',   base_url: '' },
  { name: 'Custom',    model: 'gpt-4o',                         placeholder: 'chave...',  base_url: 'http://localhost:11434' },
]

export default function Settings() {
  const { state, refreshSettings, showToast } = useAppStore()
  const { settings, aiProviders } = state
  const [tab, setTab] = useState('trello')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header />
      <div style={{ display: 'flex', gap: 0, padding: '0 24px', borderBottom: '1px solid var(--b1)', flexShrink: 0 }}>
        {['trello','ia','preferencias'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 16px', fontSize: 12, fontWeight: 500,
            color: tab === t ? 'var(--ac2)' : 'var(--t3)',
            borderBottom: `2px solid ${tab === t ? 'var(--ac)' : 'transparent'}`,
            background: 'none', transition: 'all .15s', marginBottom: -1,
          }}>
            {{ trello: 'Trello', ia: 'Inteligência Artificial', preferencias: 'Preferências' }[t]}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {tab === 'trello'       && <TrelloTab     settings={settings} onRefresh={refreshSettings} onToast={showToast} />}
        {tab === 'ia'           && <AITab         providers={aiProviders} onRefresh={refreshSettings} onToast={showToast} />}
        {tab === 'preferencias' && <PrefsTab      settings={settings} onRefresh={refreshSettings} onToast={showToast} />}
      </div>
    </div>
  )
}

function Header() {
  return (
    <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid var(--b1)', flexShrink: 0 }}>
      <h1 style={{ fontSize: 16, fontWeight: 800 }}>Configurações</h1>
      <p style={{ fontSize: 12, color: 'var(--t3)', marginTop: 3 }}>
        Suas chaves são criptografadas e salvas localmente. Nunca saem do seu computador.
      </p>
    </div>
  )
}

// ─── Tab: Trello ──────────────────────────────────────────────────────────────
function TrelloTab({ settings, onRefresh, onToast }) {
  const [apiKey,   setApiKey]   = useState(settings.trello_api_key  || '')
  const [token,    setToken]    = useState(settings.trello_token     || '')
  const [testBoard, setTestBoard] = useState('')
  const [checking, setChecking] = useState(false)
  const [status,   setStatus]   = useState(null) // { ok, message }

  function extractBoardId(input) {
    if (!input) return 'x'
    const trimmed = input.trim()
    // Tenta extrair ID da URL (ex: trello.com/b/ID/...)
    const urlMatch = trimmed.match(/trello\.com\/b\/([^/]+)/)
    return urlMatch ? urlMatch[1] : trimmed
  }

  async function save() {
    setChecking(true)
    setStatus(null)
    const bid = extractBoardId(testBoard)
    
    try {
      const res = await window.api?.settings.validateTrello({ apiKey, token, boardId: bid })
      
      const isOk = res?.ok
      await window.api?.settings.set({ key: 'trello_api_key', value: apiKey, encrypted: true })
      await window.api?.settings.set({ key: 'trello_token',   value: token,  encrypted: true })
      
      if (isOk) {
        setStatus({ ok: true, message: bid === 'x' ? `Conectado como ${res.fullName}` : `Acesso confirmado ao board: ${res.boardName}` })
        onToast('success', 'Credenciais do Trello salvas!')
        onRefresh()
      } else {
        setStatus({ ok: false, message: res?.error || 'Credenciais inválidas' })
        onToast('error', 'Falha na validação das chaves.')
      }
    } catch (e) {
      setStatus({ ok: false, message: e.message })
    } finally {
      setChecking(false)
    }
  }

  return (
    <div style={{ maxWidth: 500, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionLabel>Credenciais do Trello</SectionLabel>

      <Input
        label="API Key"
        type="password"
        value={apiKey}
        onChange={e => setApiKey(e.target.value)}
        placeholder="32 caracteres alfanuméricos"
        hint="Acesse: trello.com/app-key"
      />
      <Input
        label="Token"
        type="password"
        value={token}
        onChange={e => setToken(e.target.value)}
        placeholder="64 caracteres"
        hint="Gerado na mesma página da API Key"
      />

      <Divider />
      
      <div style={{ padding: 14, background: 'var(--s2)', borderRadius: 'var(--r)', border: '1px solid var(--b1)' }}>
        <SectionLabel style={{ fontSize: 9 }}>Teste de Acesso (Opcional)</SectionLabel>
        <Input
          label="URL ou ID de um Board"
          value={testBoard}
          onChange={e => setTestBoard(e.target.value)}
          placeholder="https://trello.com/b/..."
          style={{ background: 'var(--s1)' }}
          hint="Cole o link do seu board de teste para validar o acesso real."
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Btn onClick={save} disabled={!apiKey || !token || checking}>
          {checking ? <><Spinner size={13} /> Verificando...</> : 'Salvar e Validar Acesso'}
        </Btn>
        
        {status && (
          <div style={{ 
            fontSize: 11, 
            padding: '8px 12px', 
            borderRadius: 4, 
            fontFamily: 'var(--mono)',
            background: status.ok ? 'var(--green-bg)' : 'var(--red-bg)',
            color: status.ok ? 'var(--green)' : 'var(--red)',
            border: `1px solid ${status.ok ? 'var(--green)' : 'var(--red)'}`
          }}>
            {status.ok ? '✓ ' : '✗ '} {status.message}
          </div>
        )}
      </div>

      <Divider />
      <div style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.8, fontFamily: 'var(--mono)' }}>
        <div>1. Acesse <span style={{ color: 'var(--ac2)' }}>trello.com/app-key</span></div>
        <div>2. Copie sua <strong style={{ color: 'var(--t2)' }}>API Key</strong></div>
        <div>3. Clique em "Token" e autorize o aplicativo</div>
        <div>4. Cole o token gerado no campo acima</div>
      </div>
    </div>
  )
}

// ─── Tab: IA ──────────────────────────────────────────────────────────────────
function AITab({ providers, onRefresh, onToast }) {
  const [adding,   setAdding]   = useState(false)
  const [editing,  setEditing]  = useState(null) // provider object
  const [checking, setChecking] = useState(null)

  async function setActive(id) {
    await window.api?.ai.setActive({ id })
    onRefresh()
    onToast('success', 'Provider ativado.')
  }

  async function remove(id) {
    await window.api?.ai.deleteProvider({ id })
    onRefresh()
  }

  async function validateProvider(provider) {
    setChecking(provider.id)
    const res = await window.api?.ai.validateKey({ provider })
    setChecking(null)
    if (res?.ok) onToast('success', `${provider.name} validado — ${res.taskCount} task(s) de teste geradas.`)
    else         onToast('error',   `Erro: ${res?.error || 'desconhecido'}`)
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <SectionLabel style={{ marginBottom: 0 }}>Providers de IA Configurados</SectionLabel>
        <Btn size="sm" onClick={() => { setEditing(null); setAdding(true) }}>+ Adicionar</Btn>
      </div>

      {providers.length === 0 && (
        <EmptyState icon="🤖" title="Nenhum provider configurado"
          description="Adicione um provider de IA para usar o gerador automático de tarefas."
          action={<Btn onClick={() => setAdding(true)}>Adicionar Provider</Btn>}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {providers.map(p => (
          <div key={p.id} style={{
            padding: '12px 14px', borderRadius: 'var(--r)',
            background: p.is_active ? 'var(--ac-bg)' : 'var(--s2)',
            border: `1px solid ${p.is_active ? 'var(--ac)' : 'var(--b1)'}`,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ fontSize: 20 }}>
              {{ openai: '⚡', anthropic: '◆', gemini: '✦' }[p.name?.toLowerCase()] || '🔌'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
              <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--mono)' }}>{p.model}</div>
            </div>
            {p.is_active && <span style={{ fontSize: 10, color: 'var(--green)', fontFamily: 'var(--mono)' }}>● ativo</span>}
            <Btn size="xs" variant="ghost" onClick={() => validateProvider(p)} disabled={checking === p.id}>
              {checking === p.id ? <Spinner size={11} /> : 'Testar'}
            </Btn>
            <Btn size="xs" variant="ghost" onClick={() => { setEditing(p); setAdding(true) }}>Editar</Btn>
            {!p.is_active && <Btn size="xs" variant="success" onClick={() => setActive(p.id)}>Ativar</Btn>}
            <Btn size="xs" variant="danger" onClick={() => remove(p.id)}>✕</Btn>
          </div>
        ))}
      </div>

      {adding && (
        <ProviderForm
          initial={editing}
          onSave={async (data) => {
            await window.api?.ai.upsertProvider(data)
            onRefresh()
            setAdding(false)
            onToast('success', `Provider ${data.name} salvo.`)
          }}
          onClose={() => setAdding(false)}
        />
      )}
    </div>
  )
}

function ProviderForm({ initial, onSave, onClose }) {
  const preset = PROVIDER_PRESETS.find(p => p.name === initial?.name) || PROVIDER_PRESETS[0]
  const [name,    setName]    = useState(initial?.name     || preset.name)
  const [model,   setModel]   = useState(initial?.model    || preset.model)
  const [apiKey,  setApiKey]  = useState(initial?.api_key  || '')
  const [baseUrl, setBaseUrl] = useState(initial?.base_url || '')

  const isCustom = name === 'Custom'

  function applyPreset(p) {
    setName(p.name)
    setModel(p.model)
    setBaseUrl(p.base_url)
  }

  return (
    <div style={{
      marginTop: 16, padding: 16, background: 'var(--s3)',
      border: '1px solid var(--b2)', borderRadius: 'var(--r)',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <SectionLabel>{initial ? 'Editar' : 'Novo'} Provider</SectionLabel>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {PROVIDER_PRESETS.map(p => (
          <button key={p.name} onClick={() => applyPreset(p)} style={{
            padding: '4px 10px', borderRadius: 99, fontSize: 11,
            background: name === p.name ? 'var(--ac-bg)' : 'var(--s2)',
            border: `1px solid ${name === p.name ? 'var(--ac)' : 'var(--b1)'}`,
            color: name === p.name ? 'var(--ac2)' : 'var(--t2)', cursor: 'pointer',
          }}>{p.name}</button>
        ))}
      </div>

      <Input label="Modelo" value={model} onChange={e => setModel(e.target.value)} placeholder="ex: gpt-4o" />
      <Input label="API Key" type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={preset.placeholder} />
      {isCustom && <Input label="Base URL" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="http://localhost:11434" hint="Para Ollama, LM Studio, etc." />}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={() => onSave({ id: initial?.id, name, model, api_key: apiKey, base_url: baseUrl, is_active: initial?.is_active || 0 })} disabled={!model || !apiKey}>
          Salvar
        </Btn>
      </div>
    </div>
  )
}

// ─── Tab: Preferências ────────────────────────────────────────────────────────
function PrefsTab({ settings, onRefresh, onToast }) {
  const [delay, setDelay] = useState(settings.import_delay_ms || '300')

  async function save() {
    await window.api?.settings.set({ key: 'import_delay_ms', value: delay })
    onRefresh()
    onToast('success', 'Preferências salvas.')
  }

  return (
    <div style={{ maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionLabel>Importação</SectionLabel>
      <Input
        label="Delay entre cards (ms)"
        type="number"
        value={delay}
        onChange={e => setDelay(e.target.value)}
        hint="Mínimo recomendado: 200ms para evitar rate limit do Trello"
      />
      <Btn onClick={save} style={{ alignSelf: 'flex-start' }}>Salvar</Btn>
    </div>
  )
}
