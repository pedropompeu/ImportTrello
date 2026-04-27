import { Zap, LayoutDashboard, FolderKanban, Download, Settings, BookOpen } from 'lucide-react'
import { useAppStore } from '../../store/store.jsx'

const NAV = [
  { id: 'dashboard', Icon: LayoutDashboard, label: 'Dashboard'     },
  { id: 'projects',  Icon: FolderKanban,    label: 'Projetos'      },
  { id: 'importer',  Icon: Download,        label: 'Importar'      },
  { id: 'settings',  Icon: Settings,        label: 'Configurações' },
  { id: 'tutorial',  Icon: BookOpen,        label: 'Tutorial'      },
]

export default function Sidebar() {
  const { state, navigate } = useAppStore()
  const { view, projects, settings, aiProviders } = state

  const trelloOk    = !!(settings.trello_api_key && settings.trello_token)
  const aiOk        = aiProviders.some(p => p.is_active)
  const doneProjects = projects.filter(p => p.status === 'done').length

  return (
    <aside style={{
      width: 220, background: 'var(--s1)',
      borderRight: '1px solid var(--b1)',
      display: 'flex', flexDirection: 'column',
      flexShrink: 0,
    }}>

      {/* Logo */}
      <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid var(--b1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ background: 'var(--ac-bg)', border: '1px solid rgba(79,110,247,.3)', borderRadius: 6, padding: 5, display: 'flex' }}>
            <Zap size={14} style={{ color: 'var(--ac2)' }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-.02em' }}>Trello Smart</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--t3)', fontFamily: 'var(--mono)', letterSpacing: '.5px' }}>IMPORTER</div>
          </div>
          <span style={{
            marginLeft: 'auto', fontSize: 9, fontFamily: 'var(--mono)', fontWeight: 600,
            padding: '2px 5px', borderRadius: 4,
            background: 'var(--ac-bg)', color: 'var(--ac2)', border: '1px solid rgba(79,110,247,.25)',
          }}>v2.0</span>
        </div>

        {/* Status pills */}
        <div style={{ display: 'flex', gap: 5 }}>
          <StatusPill ok={trelloOk} label="Trello" />
          <StatusPill ok={aiOk}     label="IA"     />
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '8px 8px' }}>
        {NAV.map(({ id, Icon, label }) => {
          const active = view === id
          return (
            <NavItem key={id} id={id} Icon={Icon} label={label} active={active}
              badge={id === 'projects' && projects.length > 0 ? projects.length : null}
              onClick={() => navigate(id)}
            />
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--b1)' }}>
        <FooterStat label="Total de projetos" value={projects.length} />
        <FooterStat label="Concluídos" value={doneProjects} color="var(--green)" />
      </div>
    </aside>
  )
}

function NavItem({ id, Icon, label, active, badge, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 9,
        padding: '7px 10px', borderRadius: 'var(--r-sm)', marginBottom: 2,
        background: active ? 'var(--ac-bg)' : 'transparent',
        color: active ? 'var(--ac2)' : 'var(--t2)',
        fontSize: 13, fontWeight: active ? 600 : 400,
        borderLeft: active ? '2px solid var(--ac)' : '2px solid transparent',
        transition: 'all .12s',
      }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--s2)'; e.currentTarget.style.color = 'var(--t1)' } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t2)' } }}
    >
      <Icon size={15} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{label}</span>
      {badge != null && (
        <span style={{
          fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 600,
          background: active ? 'rgba(79,110,247,.2)' : 'var(--s3)',
          color: active ? 'var(--ac2)' : 'var(--t3)',
          padding: '1px 6px', borderRadius: 99,
        }}>
          {badge}
        </span>
      )}
    </button>
  )
}

function StatusPill({ ok, label }) {
  return (
    <span style={{
      flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
      fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 500,
      padding: '3px 0', borderRadius: 4,
      background: ok ? 'rgba(52,201,138,.1)' : 'var(--s3)',
      border: `1px solid ${ok ? 'rgba(52,201,138,.3)' : 'var(--b1)'}`,
      color: ok ? 'var(--green)' : 'var(--t3)',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: ok ? 'var(--green)' : 'var(--t4)', flexShrink: 0 }} />
      {label}
    </span>
  )
}

function FooterStat({ label, value, color = 'var(--t2)' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
      <span style={{ fontSize: 11, color: 'var(--t3)' }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: 'var(--mono)' }}>{value}</span>
    </div>
  )
}
