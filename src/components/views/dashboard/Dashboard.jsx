import { useAppStore } from '../../../store/store.jsx'
import { Btn, SectionLabel, Divider } from '../../ui/index.jsx'

export default function Dashboard() {
  const { state, navigate } = useAppStore()
  const { projects, boards, aiProviders } = state

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ padding: '24px 30px', borderBottom: '1px solid var(--b1)', background: 'var(--s1)' }}>
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>Bem-vindo ao Trello Importer</h1>
        <p style={{ fontSize: 13, color: 'var(--t3)', marginTop: 4 }}>
          Sua central de automação de tarefas para o Trello.
        </p>
      </div>

      <div style={{ padding: '30px', display: 'grid', gridTemplateColumns: '1fr 340px', gap: 30 }}>
        
        {/* Lado Esquerdo: Tutorial e Guias */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          <section>
            <SectionLabel style={{ color: 'var(--ac)' }}>🚀 Guia Rápido: Como usar</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12 }}>
              <GuideCard 
                icon="🤖" 
                title="Geração com IA" 
                desc="Descreva seu projeto em linguagem natural. A IA separará em Sprints e criará checklists técnicos automaticamente."
              />
              <GuideCard 
                icon="📊" 
                title="Importação de Planilhas" 
                desc="Suporta Excel (XLSX) e CSV. Use colunas como 'titulo', 'sprint', 'tipo' e 'checkItems' (separados por vírgula)."
              />
              <GuideCard 
                icon="📝" 
                title="Projeto Manual" 
                desc="Crie um rascunho em branco e adicione cada card manualmente antes de subir para o Trello."
              />
              <GuideCard 
                icon="⚡" 
                title="Envio Sequencial" 
                desc="As tarefas são enviadas uma a uma para evitar bloqueios da API, garantindo que checklists e anexos subam corretamente."
              />
            </div>
          </section>

          <section style={{ background: 'var(--s2)', padding: '20px', borderRadius: 'var(--r)', border: '1px solid var(--b1)' }}>
            <SectionLabel>📄 Formatos de Documentos</SectionLabel>
            <div style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.6 }}>
              <p>O importador lê seus arquivos da seguinte forma:</p>
              <ul style={{ marginLeft: 20, marginTop: 10 }}>
                <li><strong>Excel/CSV:</strong> Deve conter uma linha de cabeçalho. O sistema mapeia termos próximos (ex: 'task' vira 'titulo').</li>
                <li><strong>JSON:</strong> Segue a estrutura <code>{"{ sprints: [{ tasks: [...] }] }"}</code>.</li>
                <li><strong>Checklists:</strong> Em planilhas, separe os itens por <code>|</code> ou vírgula na coluna 'checklist'.</li>
              </ul>
            </div>
          </section>

        </div>

        {/* Lado Direito: Atalhos e Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          <div style={{ background: 'var(--ac-bg)', padding: '20px', borderRadius: 'var(--r)', border: '1px solid var(--ac)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--ac2)' }}>Atalhos Rápidos</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
              <Btn onClick={() => navigate('importer')} style={{ width: '100%', justifyContent: 'flex-start' }}>✦ Nova Importação IA</Btn>
              <Btn variant="subtle" onClick={() => navigate('projects')} style={{ width: '100%', justifyContent: 'flex-start' }}>📂 Ver Meus Projetos</Btn>
              <Btn variant="ghost" onClick={() => navigate('settings')} style={{ width: '100%', justifyContent: 'flex-start' }}>⚙️ Configurar APIs</Btn>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <StatSmall label="Projetos" value={projects.length} />
            <StatSmall label="Boards" value={boards.length} />
          </div>

          {!aiProviders.some(p => p.is_active) && (
            <div style={{ padding: 16, background: 'var(--red-bg)', border: '1px solid var(--red)', borderRadius: 'var(--r)', fontSize: 12, color: 'var(--red)' }}>
              <strong>⚠ IA Desativada:</strong> Você precisa configurar uma API Key (Gemini ou OpenAI) para usar o gerador.
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

function GuideCard({ icon, title, desc }) {
  return (
    <div style={{ padding: 16, background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 'var(--r)' }}>
      <div style={{ fontSize: 24, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.5 }}>{desc}</div>
    </div>
  )
}

function StatSmall({ label, value }) {
  return (
    <div style={{ padding: '12px', background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: 'var(--r)', textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--ac2)' }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
    </div>
  )
}
