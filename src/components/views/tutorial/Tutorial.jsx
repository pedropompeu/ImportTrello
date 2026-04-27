import { Sparkles, FileSpreadsheet, PenLine, MousePointerClick, Send, Settings } from 'lucide-react'
import { useAppStore } from '../../../store/store.jsx'
import { Btn, Divider } from '../../ui/index.jsx'

const STEPS = [
  {
    num: 1,
    title: 'Configuração Inicial',
    desc: 'Antes de tudo, você precisa conectar o aplicativo ao seu Trello e configurar uma IA (opcional, mas recomendado).',
    steps: [
      'Vá em Configurações no menu lateral.',
      'Insira sua API Key e Token do Trello (há links de ajuda na página).',
      'Escolha um provedor de IA (Gemini, OpenAI ou Anthropic) e insira a chave correspondente.',
      'Clique em Salvar e Validar Acesso.',
    ],
  },
  {
    num: 2,
    title: 'Importando seu Primeiro Projeto',
    desc: 'Existem três formas de inserir dados no sistema na aba Importar:',
    cards: [
      { Icon: Sparkles,       title: 'Via IA',        desc: 'Descreva o projeto (ex: "Site de advocacia com 4 sprints") e a IA estruturará tudo.' },
      { Icon: FileSpreadsheet, title: 'Planilhas',     desc: 'Arraste um CSV ou XLSX. O sistema mapeia colunas como título, descrição e checklists.' },
      { Icon: PenLine,        title: 'Manual',         desc: 'Crie um projeto vazio e adicione tarefas e sprints uma a uma manualmente.' },
    ],
  },
  {
    num: 3,
    title: 'Refinando no Preview',
    desc: 'Após importar, você verá a tela de Preview. É aqui que a edição acontece antes de enviar para o Trello.',
    steps: [
      'Edição Rápida: Clique no título de qualquer tarefa para renomeá-la instantaneamente.',
      'Edição Detalhada: Clique no ícone de lápis para abrir o modal, onde pode ajustar descrições (Markdown), checklists e etiquetas.',
      'Organização: Arraste tarefas entre sprints ou mude a ordem conforme necessário.',
    ],
    Icon: MousePointerClick,
  },
  {
    num: 4,
    title: 'Sincronizando com o Trello',
    desc: 'O passo final é levar seu planejamento para o quadro real.',
    steps: [
      'No painel de Preview, selecione as tasks que deseja enviar.',
      'Clique em Enviar Selecionadas.',
      'Acompanhe o log em tempo real enquanto o sistema cria listas, etiquetas, cards e checklists.',
    ],
    Icon: Send,
  },
]

export default function Tutorial() {
  const { navigate } = useAppStore()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', background: 'var(--bg)' }}>

      {/* Header */}
      <div style={{
        padding: '20px 28px', borderBottom: '1px solid var(--b1)', background: 'var(--s1)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 10, flexShrink: 0,
      }}>
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 800 }}>Guia Completo de Uso</h1>
          <p style={{ fontSize: 12, color: 'var(--t3)', marginTop: 3 }}>
            Aprenda a dominar todas as funcionalidades do Trello Smart Importer.
          </p>
        </div>
        <Btn variant="ghost" onClick={() => navigate('dashboard')}>← Voltar ao Início</Btn>
      </div>

      <div style={{ padding: '36px 60px', maxWidth: 860, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 36 }}>

        {STEPS.map((s, i) => (
          <section key={s.num}>
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              {/* Step circle */}
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: 'var(--ac)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 800, color: '#fff', fontFamily: 'var(--mono)',
              }}>
                {s.num}
              </div>

              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--t1)' }}>{s.title}</h2>
                <p style={{ color: 'var(--t2)', lineHeight: 1.65, marginBottom: 16, fontSize: 13 }}>{s.desc}</p>

                {s.steps && (
                  <div style={{ background: 'var(--s2)', padding: '16px 20px', borderRadius: 'var(--r)', border: '1px solid var(--b1)' }}>
                    <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: 0, paddingLeft: 0, listStyle: 'none' }}>
                      {s.steps.map((step, j) => (
                        <li key={j} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, color: 'var(--t2)' }}>
                          <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--s3)', border: '1px solid var(--b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--ac2)', flexShrink: 0, marginTop: 1 }}>
                            {j + 1}
                          </span>
                          <span style={{ lineHeight: 1.55 }}>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {s.cards && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    {s.cards.map(card => (
                      <div
                        key={card.title}
                        style={{ background: 'var(--s1)', padding: 16, borderRadius: 'var(--r)', border: '1px solid var(--b1)', display: 'flex', flexDirection: 'column', gap: 10 }}
                      >
                        <div style={{ width: 30, height: 30, borderRadius: 7, background: 'var(--s3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <card.Icon size={14} style={{ color: 'var(--ac2)' }} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: 'var(--t1)' }}>{card.title}</div>
                          <p style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.5 }}>{card.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {i < STEPS.length - 1 && <Divider style={{ marginTop: 36, marginBottom: 0 }} />}
          </section>
        ))}

        {/* CTA final */}
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: 'var(--t1)' }}>Pronto para começar?</h3>
          <p style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 20 }}>Configure suas credenciais e crie seu primeiro projeto.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <Btn onClick={() => navigate('settings')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Settings size={13} /> Ir para Configurações
            </Btn>
            <Btn variant="ghost" onClick={() => navigate('importer')}>
              Importar Projeto →
            </Btn>
          </div>
        </div>

      </div>
    </div>
  )
}
