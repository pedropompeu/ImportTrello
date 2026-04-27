import { useAppStore } from '../../../store/store.jsx'
import { Btn, SectionLabel } from '../../ui/index.jsx'

export default function Dashboard() {
  const { state, navigate } = useAppStore()
  const { projects, aiProviders } = state

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', background: 'var(--bg)' }}>
      {/* Header Minimalista */}
      <div style={{ padding: '40px 30px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--t1)' }}>Trello Smart Importer</h1>
        <p style={{ fontSize: 15, color: 'var(--t3)', marginTop: 8 }}>
          Transforme ideias e arquivos em quadros estruturados no Trello em segundos.
        </p>
      </div>

      <div style={{ padding: '0 30px 40px', maxWidth: 900, margin: '0 auto', width: '100%' }}>
        
        {/* Cards Principais */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 40 }}>
          
          <ActionCard 
            icon="📖"
            title="Aprenda a usar a plataforma"
            desc="Veja o tutorial completo com o passo a passo de todas as funcionalidades e como configurar suas APIs."
            label="Ver Tutorial"
            onClick={() => navigate('tutorial')}
            color="var(--ac)"
          />

          <ActionCard 
            icon="🚀"
            title="Comece a usar agora"
            desc="Vá direto para as configurações para conectar sua conta e iniciar sua primeira importação."
            label="Ir para Configurações"
            onClick={() => navigate('settings')}
            color="#10b981" // Um verde suave para 'começar'
          />

        </div>

        {/* Resumo Rápido */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>
          
          <section style={{ background: 'var(--s1)', padding: 24, borderRadius: 'var(--r)', border: '1px solid var(--b1)' }}>
            <SectionLabel>📂 Projetos Recentes</SectionLabel>
            {projects.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
                {projects.slice(0, 3).map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--s2)', borderRadius: 8, border: '1px solid var(--b1)' }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</span>
                    <Btn variant="ghost" onClick={() => navigate('preview', p.id)}>Abrir</Btn>
                  </div>
                ))}
                <Btn variant="subtle" onClick={() => navigate('projects')} style={{ marginTop: 8 }}>Ver todos os projetos</Btn>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--t3)', marginTop: 16 }}>Você ainda não criou nenhum projeto.</p>
            )}
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: 'var(--s1)', padding: 24, borderRadius: 'var(--r)', border: '1px solid var(--b1)' }}>
              <SectionLabel>⚙️ Status das APIs</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
                <StatusItem label="Trello" active={!!state.settings?.trello_token} />
                <StatusItem label="IA (Gemini/OpenAI)" active={aiProviders.some(p => p.is_active)} />
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}

function ActionCard({ icon, title, desc, label, onClick, color }) {
  return (
    <div 
      onClick={onClick}
      style={{ 
        padding: 30, 
        background: 'var(--s1)', 
        border: '2px solid var(--b1)', 
        borderRadius: 16, 
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 16,
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = color
        e.currentTarget.style.transform = 'translateY(-4px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--b1)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <div style={{ fontSize: 40 }}>{icon}</div>
      <h3 style={{ fontSize: 18, fontWeight: 800 }}>{title}</h3>
      <p style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.5 }}>{desc}</p>
      <Btn style={{ background: color, color: '#fff', border: 'none', padding: '10px 20px', marginTop: 8 }}>{label}</Btn>
    </div>
  )
}

function StatusItem({ label, active }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: active ? '#10b981' : '#ef4444' }} />
      <span style={{ color: 'var(--t2)' }}>{label}:</span>
      <span style={{ fontWeight: 700, color: active ? '#10b981' : '#ef4444' }}>{active ? 'Conectado' : 'Pendente'}</span>
    </div>
  )
}
