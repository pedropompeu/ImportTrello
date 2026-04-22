import { useAppStore } from '../../store/store.jsx'

const NAV = [
  { id: 'dashboard', icon: '◈', label: 'Dashboard'   },
  { id: 'projects',  icon: '⬡', label: 'Projetos'    },
  { id: 'importer',  icon: '⊕', label: 'Importar'    },
  { id: 'settings',  icon: '⚙', label: 'Configurações'},
]

export default function Sidebar() {
  const { state, navigate } = useAppStore()
  const { view, projects, settings } = state

  const trelloOk = !!(settings.trello_api_key && settings.trello_token)
  const aiOk     = state.aiProviders.some(p => p.is_active)

  const totalTasks   = 0 // seria calculado via query
  const doneProjects = projects.filter(p => p.status === 'done').length

  return (
    <aside style={{
      width: 210, background: 'var(--s1)',
      borderRight: '1px solid var(--b1)',
      display: 'flex', flexDirection: 'column',
      padding: '0 0 12px', flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid var(--b1)' }}>
        <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-.3px' }}>
          Trello Smart
        </div>
        <div style={{ fontSize: 9, color: 'var(--ac2)', fontFamily: 'var(--mono)', letterSpacing: '1px', marginTop: 2 }}>
          IMPORTER v2.0
        </div>
      </div>

      {/* Status indicators */}
      <div style={{ padding: '10px 12px', display: 'flex', gap: 6 }}>
        <Pill active={trelloOk} label="Trello" />
        <Pill active={aiOk}     label="IA"     />
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '4px 8px' }}>
        {NAV.map(({ id, icon, label }) => {
          const active = view === id
          return (
            <button
              key={id}
              onClick={() => navigate(id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 'var(--r-sm)', marginBottom: 1,
                background: active ? 'var(--ac-bg)' : 'transparent',
                color: active ? 'var(--ac2)' : 'var(--t2)',
                fontSize: 13, fontWeight: active ? 600 : 400,
                border: `1px solid ${active ? 'var(--ac-bg)' : 'transparent'}`,
                transition: 'all .12s',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--s3)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontSize: 15, fontFamily: 'var(--mono)', lineHeight: 1 }}>{icon}</span>
              {label}
              {id === 'projects' && projects.length > 0 && (
                <span style={{ marginLeft: 'auto', fontSize: 10, background: 'var(--s3)', color: 'var(--t3)', padding: '1px 6px', borderRadius: 99, fontFamily: 'var(--mono)' }}>
                  {projects.length}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer stats */}
      <div style={{ padding: '10px 12px 0', borderTop: '1px solid var(--b1)' }}>
        <Stat label="projetos"   value={projects.length} />
        <Stat label="concluídos" value={doneProjects}    color="var(--green)" />
      </div>
    </aside>
  )
}

function Pill({ active, label }) {
  return (
    <span style={{
      flex: 1, textAlign: 'center',
      fontSize: 9, padding: '2px 0',
      borderRadius: 99, fontFamily: 'var(--mono)', letterSpacing: '.3px',
      background: active ? 'var(--green-bg)' : 'var(--s3)',
      border: `1px solid ${active ? 'var(--green)' : 'var(--b1)'}`,
      color: active ? 'var(--green)' : 'var(--t3)',
    }}>
      {active ? '● ' : '○ '}{label}
    </span>
  )
}

function Stat({ label, value, color = 'var(--t2)' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
      <span style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--mono)' }}>{label}</span>
      <span style={{ fontSize: 10, fontWeight: 700, color, fontFamily: 'var(--mono)' }}>{value}</span>
    </div>
  )
}
