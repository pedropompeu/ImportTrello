import { useState } from 'react'
import { Zap, Bot, Gem, Plug, Eye, EyeOff, Check, X as XIcon, RefreshCw } from 'lucide-react'
import { useAppStore } from '../../../store/store.jsx'
import { Btn, Input, SectionLabel, Divider, Spinner, EmptyState } from '../../ui/index.jsx'

const PROVIDER_PRESETS = [
  { name: 'OpenAI',    model: 'gpt-4o',                    placeholder: 'sk-...',     base_url: '' },
  { name: 'Anthropic', model: 'claude-sonnet-4-20250514',  placeholder: 'sk-ant-...', base_url: '' },
  { name: 'Gemini',    model: 'gemini-1.5-pro',            placeholder: 'AIza...',    base_url: '' },
  { name: 'Custom',    model: 'gpt-4o',                    placeholder: 'chave...',   base_url: 'http://localhost:11434' },
]

const PROVIDER_ICONS = {
  openai:    { Icon: Zap,  color: '#10b77f' },
  anthropic: { Icon: Bot,  color: '#e66f3c' },
  gemini:    { Icon: Gem,  color: '#4285f4' },
}

export default function Settings() {
  const { state, refreshSettings, showToast } = useAppStore()
  const { settings, aiProviders } = state
  const [tab, setTab] = useState('trello')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header />
      <div style={{ display: 'flex', gap: 0, padding: '0 24px', borderBottom: '1px solid var(--b1)', flexShrink: 0 }}>
        {['trello', 'ia', 'preferencias'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '10px 16px', fontSize: 12, fontWeight: 500,
              color: tab === t ? 'var(--ac2)' : 'var(--t3)',
              borderBottom: `2px solid ${tab === t ? 'var(--ac)' : 'transparent'}`,
              background: 'none', transition: 'all .15s', marginBottom: -1,
            }}
          >
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

// ─── Componente de input com toggle show/hide ──────────────────────────────────
function SecretInput({ label, value, onChange, placeholder, hint }) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && (
        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.6px', fontFamily: 'var(--mono)' }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          style={{
            width: '100%', padding: '8px 36px 8px 11px',
            background: 'var(--s2)', border: '1px solid var(--b1)',
            borderRadius: 'var(--r-sm)', color: 'var(--t1)', fontSize: 13,
            transition: 'border-color .12s', outline: 'none',
          }}
          onFocus={e  => e.target.style.borderColor = 'var(--ac)'}
          onBlur={e   => e.target.style.borderColor = 'var(--b1)'}
        />
        <button
          type="button"
          onClick={() => setShow(p => !p)}
          style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', display: 'flex', padding: 2,
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--t1)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--t3)'}
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      {hint && <span style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--mono)' }}>{hint}</span>}
    </div>
  )
}

// ─── Tab: Trello ──────────────────────────────────────────────────────────────
function TrelloTab({ settings, onRefresh, onToast }) {
  const [apiKey,    setApiKey]    = useState(settings.trello_api_key || '')
  const [token,     setToken]     = useState(settings.trello_token   || '')
  const [testBoard, setTestBoard] = useState('')
  const [checking,  setChecking]  = useState(false)
  const [status,    setStatus]    = useState(null)

  function extractBoardId(input) {
    if (!input) return 'x'
    const trimmed = input.trim()
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

      <SecretInput
        label="API Key"
        value={apiKey}
        onChange={e => setApiKey(e.target.value)}
        placeholder="32 caracteres alfanuméricos"
        hint="Acesse: trello.com/app-key"
      />
      <SecretInput
        label="Token"
        value={token}
        onChange={e => setToken(e.target.value)}
        placeholder="64 caracteres"
        hint="Gerado na mesma página da API Key"
      />

      <Divider />

      <div style={{ padding: 14, background: 'var(--s2)', borderRadius: 'var(--r)', border: '1px solid var(--b1)' }}>
        <SectionLabel style={{ fontSize: 9, marginBottom: 10 }}>Teste de Acesso (Opcional)</SectionLabel>
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
          {checking
            ? <><Spinner size={13} /> Verificando...</>
            : <><RefreshCw size={13} /> Salvar e Validar Acesso</>}
        </Btn>

        {status && (
          <div style={{
            fontSize: 11, padding: '10px 12px', borderRadius: 'var(--r-sm)',
            fontFamily: 'var(--mono)', display: 'flex', alignItems: 'center', gap: 8,
            background: status.ok ? 'var(--green-bg)' : 'var(--red-bg)',
            color:      status.ok ? 'var(--green)'    : 'var(--red)',
            border: `1px solid ${status.ok ? 'rgba(52,201,138,.3)' : 'rgba(240,92,110,.3)'}`,
          }}>
            {status.ok ? <Check size={12} /> : <XIcon size={12} />}
            {status.message}
          </div>
        )}
      </div>

      <Divider />
      <div style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 2, fontFamily: 'var(--mono)' }}>
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
  const [editing,  setEditing]  = useState(null)
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
        <EmptyState
          icon={<Bot size={36} />}
          title="Nenhum provider configurado"
          description="Adicione um provider de IA para usar o gerador automático de tarefas."
          action={<Btn onClick={() => setAdding(true)}>Adicionar Provider</Btn>}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {providers.map(p => {
          const key  = p.name?.toLowerCase()
          const prov = PROVIDER_ICONS[key] || { Icon: Plug, color: 'var(--t2)' }
          return (
            <div
              key={p.id}
              style={{
                padding: '12px 14px', borderRadius: 'var(--r)',
                background: p.is_active ? 'var(--ac-bg)' : 'var(--s2)',
                border: `1px solid ${p.is_active ? 'rgba(79,110,247,.35)' : 'var(--b1)'}`,
                display: 'flex', alignItems: 'center', gap: 12,
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                background: p.is_active ? 'rgba(79,110,247,.15)' : 'var(--s3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <prov.Icon size={16} style={{ color: p.is_active ? 'var(--ac2)' : prov.color }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{p.name}</div>
                <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--mono)', marginTop: 1 }}>{p.model}</div>
              </div>
              {p.is_active && (
                <span style={{ fontSize: 10, color: 'var(--green)', fontFamily: 'var(--mono)', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
                  ativo
                </span>
              )}
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <Btn size="xs" variant="ghost" onClick={() => validateProvider(p)} disabled={checking === p.id}>
                  {checking === p.id ? <Spinner size={11} /> : 'Testar'}
                </Btn>
                <Btn size="xs" variant="ghost" onClick={() => { setEditing(p); setAdding(true) }}>Editar</Btn>
                {!p.is_active && <Btn size="xs" variant="success" onClick={() => setActive(p.id)}>Ativar</Btn>}
                <Btn size="xs" variant="danger" onClick={() => remove(p.id)}>
                  <XIcon size={11} />
                </Btn>
              </div>
            </div>
          )
        })}
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

      {/* Pills de seleção */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {PROVIDER_PRESETS.map(p => {
          const sel = name === p.name
          const key = p.name.toLowerCase()
          const ic  = PROVIDER_ICONS[key] || { Icon: Plug, color: 'var(--t2)' }
          return (
            <button
              key={p.name}
              onClick={() => applyPreset(p)}
              style={{
                padding: '5px 12px', borderRadius: 99, fontSize: 11,
                display: 'flex', alignItems: 'center', gap: 5,
                background: sel ? 'var(--ac-bg)' : 'var(--s2)',
                border: `1px solid ${sel ? 'var(--ac)' : 'var(--b1)'}`,
                color: sel ? 'var(--ac2)' : 'var(--t2)', cursor: 'pointer',
                transition: 'all .12s',
              }}
            >
              <ic.Icon size={11} style={{ color: sel ? 'var(--ac2)' : ic.color }} />
              {p.name}
            </button>
          )
        })}
      </div>

      <Input label="Modelo" value={model} onChange={e => setModel(e.target.value)} placeholder="ex: gpt-4o" />
      <SecretInput label="API Key" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={preset.placeholder} />
      {isCustom && (
        <Input label="Base URL" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="http://localhost:11434" hint="Para Ollama, LM Studio, etc." />
      )}

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

  const delayNum = Number(delay)

  return (
    <div style={{ maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionLabel>Importação</SectionLabel>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.6px', fontFamily: 'var(--mono)' }}>
          Delay entre cards (ms)
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            type="range"
            min={100}
            max={2000}
            step={50}
            value={delayNum}
            onChange={e => setDelay(e.target.value)}
            style={{ flex: 1, accentColor: 'var(--ac)' }}
          />
          <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--t1)', minWidth: 50, textAlign: 'right' }}>
            {delayNum}ms
          </span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--mono)' }}>
          Mínimo recomendado: 200ms para evitar rate limit do Trello
        </span>
      </div>

      <Btn onClick={save} style={{ alignSelf: 'flex-start' }}>Salvar</Btn>
    </div>
  )
}
