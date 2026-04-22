import { useAppStore } from '../../../store/store.jsx'
import { Btn, SectionLabel, Divider } from '../../ui/index.jsx'

export default function Tutorial() {
  const { navigate } = useAppStore()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ padding: '24px 30px', borderBottom: '1px solid var(--b1)', background: 'var(--s1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Guia Completo de Uso</h1>
          <p style={{ fontSize: 13, color: 'var(--t3)', marginTop: 4 }}>
            Aprenda a dominar todas as funcionalidades do Trello Smart Importer.
          </p>
        </div>
        <Btn onClick={() => navigate('dashboard')}>Voltar ao Início</Btn>
      </div>

      <div style={{ padding: '40px 100px', maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 40 }}>
        
        {/* Passo 1 */}
        <section>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            <div style={{ background: 'var(--ac)', color: '#fff', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, flexShrink: 0 }}>1</div>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Configuração Inicial</h2>
              <p style={{ color: 'var(--t2)', lineHeight: 1.6, marginBottom: 16 }}>
                Antes de tudo, você precisa conectar o aplicativo ao seu Trello e configurar uma IA (opcional, mas recomendado).
              </p>
              <div style={{ background: 'var(--s2)', padding: 20, borderRadius: 'var(--r)', border: '1px solid var(--b1)' }}>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: 0, paddingLeft: 20 }}>
                  <li>Vá em <strong>Configurações</strong> no menu lateral.</li>
                  <li>Insira sua <strong>API Key</strong> e <strong>Token</strong> do Trello (há links de ajuda na página).</li>
                  <li>Escolha um provedor de IA (Gemini, OpenAI ou Anthropic) e insira a chave correspondente.</li>
                  <li>Clique em <strong>Salvar Configurações</strong>.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <Divider />

        {/* Passo 2 */}
        <section>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            <div style={{ background: 'var(--ac)', color: '#fff', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, flexShrink: 0 }}>2</div>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Importando seu Primeiro Projeto</h2>
              <p style={{ color: 'var(--t2)', lineHeight: 1.6, marginBottom: 16 }}>
                Existem três formas de colocar dados no sistema na aba <strong>Importar</strong>:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div style={{ background: 'var(--s1)', padding: 16, borderRadius: 'var(--r)', border: '1px solid var(--b1)' }}>
                  <h4 style={{ fontWeight: 700, marginBottom: 8 }}>🤖 Via IA</h4>
                  <p style={{ fontSize: 12, color: 'var(--t3)' }}>Descreva o projeto (ex: "Site de advocacia com 4 sprints") e a IA estruturará tudo.</p>
                </div>
                <div style={{ background: 'var(--s1)', padding: 16, borderRadius: 'var(--r)', border: '1px solid var(--b1)' }}>
                  <h4 style={{ fontWeight: 700, marginBottom: 8 }}>📊 Planilhas</h4>
                  <p style={{ fontSize: 12, color: 'var(--t3)' }}>Arraste um CSV ou XLSX. O sistema mapeia colunas como título, descrição e checklists.</p>
                </div>
                <div style={{ background: 'var(--s1)', padding: 16, borderRadius: 'var(--r)', border: '1px solid var(--b1)' }}>
                  <h4 style={{ fontWeight: 700, marginBottom: 8 }}>📝 Manual</h4>
                  <p style={{ fontSize: 12, color: 'var(--t3)' }}>Crie um projeto vazio e adicione tarefas e sprints uma a uma manualmente.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Divider />

        {/* Passo 3 */}
        <section>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            <div style={{ background: 'var(--ac)', color: '#fff', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, flexShrink: 0 }}>3</div>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Refinando no Preview</h2>
              <p style={{ color: 'var(--t2)', lineHeight: 1.6, marginBottom: 16 }}>
                Após importar, você verá a tela de <strong>Preview</strong>. É aqui que a mágica da edição acontece antes de enviar para o Trello.
              </p>
              <div style={{ background: 'var(--s2)', padding: 20, borderRadius: 'var(--r)', border: '1px solid var(--b1)' }}>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: 0, paddingLeft: 20 }}>
                  <li><strong>Edição Rápida:</strong> Clique no título de qualquer tarefa para renomeá-la instantaneamente.</li>
                  <li><strong>Edição Detalhada:</strong> Clique no ícone de editar para abrir o modal, onde pode ajustar descrições (Markdown), checklists e etiquetas.</li>
                  <li><strong>Organização:</strong> Arraste tarefas entre sprints ou mude a ordem conforme necessário.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <Divider />

        {/* Passo 4 */}
        <section>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            <div style={{ background: 'var(--ac)', color: '#fff', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, flexShrink: 0 }}>4</div>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Sincronizando com o Trello</h2>
              <p style={{ color: 'var(--t2)', lineHeight: 1.6, marginBottom: 16 }}>
                O passo final é levar seu planejamento para o quadro real.
              </p>
              <div style={{ background: 'var(--s2)', padding: 20, borderRadius: 'var(--r)', border: '1px solid var(--b1)' }}>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: 0, paddingLeft: 20 }}>
                  <li>No painel lateral do Preview, selecione o <strong>Board</strong> de destino.</li>
                  <li>Clique em <strong>Enviar para o Trello</strong>.</li>
                  <li>Acompanhe o log em tempo real enquanto o sistema cria listas, etiquetas, cards e checklists.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20 }}>Pronto para começar?</h3>
          <Btn onClick={() => navigate('settings')} style={{ padding: '15px 40px', fontSize: 16 }}>Ir para Configurações</Btn>
        </div>

      </div>
    </div>
  )
}
