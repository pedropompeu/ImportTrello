import { useState } from 'react'
import { FolderKanban, CheckCircle2, Clock, Layers, Sparkles, FileUp, LayoutTemplate, AlertTriangle, ArrowRight, Settings, Sun, Sunset, Moon } from 'lucide-react'
import { useAppStore } from '../../../store/store.jsx'
import { Btn, SectionLabel, StatusBadge } from '../../ui/index.jsx'

export default function Dashboard() {
  const { state, navigate } = useAppStore()
  const { projects, aiProviders, settings } = state

  const trelloOk       = !!(settings.trello_api_key && settings.trello_token)
  const aiOk           = aiProviders.some(p => p.is_active)
  const doneProjects   = projects.filter(p => p.status === 'done').length
  const activeProjects = projects.filter(p => p.status === 'importing').length
  const needsSetup     = !trelloOk || !aiOk

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const GreetIcon = hour < 12 ? Sun : hour < 18 ? Sunset : Moon
  const greetColor = hour < 12 ? 'var(--yellow)' : hour < 18 ? 'var(--orange)' : 'var(--purple)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', background: 'var(--bg)' }}>

      {/* Header */}
      <div style={{ padding: '24px 28px 18px', borderBottom: '1px solid var(--b1)', background: 'var(--s1)', flexShrink: 0 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--t1)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <GreetIcon size={20} style={{ color: greetColor, flexShrink: 0 }} />
          {greeting}
        </h1>
        <p style={{ fontSize: 12, color: 'var(--t3)', marginTop: 3 }}>Aqui está o resumo do seu workspace.</p>
      </div>

      <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <StatCard Icon={FolderKanban} label="Total de Projetos"  value={projects.length}   color="var(--ac2)"    />
          <StatCard Icon={CheckCircle2} label="Concluídos"         value={doneProjects}       color="var(--green)"  />
          <StatCard Icon={Clock}        label="Em Andamento"        value={activeProjects}     color="var(--yellow)" />
          <StatCard Icon={Layers}       label="Tasks Criadas"       value="—"                  color="var(--purple)" />
        </div>

        {/* Setup Banner */}
        {needsSetup && (
          <div style={{
            padding: '14px 16px', borderRadius: 'var(--r)',
            background: 'rgba(245,166,35,.07)', border: '1px solid rgba(245,166,35,.25)',
            display: 'flex', gap: 12, alignItems: 'flex-start',
          }}>
            <AlertTriangle size={15} style={{ color: 'var(--yellow)', flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)', marginBottom: 8 }}>
                Configure antes de usar
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {!trelloOk && (
                  <SetupItem label="Credenciais do Trello não configuradas" onAction={() => navigate('settings')} actionLabel="Configurar" />
                )}
                {!aiOk && (
                  <SetupItem label="Nenhum provider de IA ativo" onAction={() => navigate('settings')} actionLabel="Adicionar IA" />
                )}
              </div>
            </div>
            <button
              onClick={() => navigate('settings')}
              style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', display: 'flex', padding: 2 }}
            >
              <Settings size={13} />
            </button>
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <SectionLabel style={{ marginBottom: 10 }}>Ações Rápidas</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <QuickAction Icon={Sparkles}       title="Gerar com IA"      desc="Descreva e a IA estrutura"      onClick={() => navigate('importer')} accent="var(--ac2)"    />
            <QuickAction Icon={FileUp}         title="Importar Arquivo"  desc="JSON, CSV ou Excel"            onClick={() => navigate('importer')} accent="var(--green)"  />
            <QuickAction Icon={LayoutTemplate} title="Usar Template"     desc="Projetos pré-configurados"     onClick={() => navigate('importer')} accent="var(--purple)" />
          </div>
        </div>

        {/* Projetos Recentes */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <SectionLabel style={{ marginBottom: 0 }}>Projetos Recentes</SectionLabel>
            {projects.length > 5 && (
              <button
                onClick={() => navigate('projects')}
                style={{ fontSize: 11, color: 'var(--ac2)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--mono)', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                Ver todos <ArrowRight size={10} />
              </button>
            )}
          </div>

          {projects.length === 0 ? (
            <div style={{
              padding: '28px 20px', background: 'var(--s1)', borderRadius: 'var(--r)',
              border: '1px solid var(--b1)', textAlign: 'center',
            }}>
              <FolderKanban size={24} style={{ color: 'var(--t4)', margin: '0 auto 10px' }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t2)', marginBottom: 4 }}>Nenhum projeto ainda</div>
              <p style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 14 }}>Crie seu primeiro projeto importando tarefas ou usando um template.</p>
              <Btn size="sm" onClick={() => navigate('importer')}>+ Criar Projeto</Btn>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {projects.slice(0, 5).map(p => (
                <RecentProjectRow key={p.id} project={p} onClick={() => navigate('preview', p.id)} />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ Icon, label, value, color }) {
  return (
    <div style={{
      padding: '16px', background: 'var(--s1)', border: '1px solid var(--b1)',
      borderRadius: 'var(--r)', display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: 30, height: 30, borderRadius: 7, background: 'var(--s3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={14} style={{ color }} />
        </div>
        <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--t1)', fontFamily: 'var(--mono)' }}>{value}</span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 500 }}>{label}</div>
    </div>
  )
}

// ─── Setup Item ───────────────────────────────────────────────────────────────
function SetupItem({ label, onAction, actionLabel }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--yellow)', flexShrink: 0 }} />
      <span style={{ flex: 1, color: 'var(--t2)' }}>{label}</span>
      <button
        onClick={onAction}
        style={{ fontSize: 11, color: 'var(--ac2)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--mono)', fontWeight: 600, flexShrink: 0 }}
      >
        {actionLabel} →
      </button>
    </div>
  )
}

// ─── Quick Action ─────────────────────────────────────────────────────────────
function QuickAction({ Icon, title, desc, onClick, accent }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '16px', borderRadius: 'var(--r)',
        background: hov ? 'var(--s2)' : 'var(--s1)',
        border: `1px solid ${hov ? 'var(--b2)' : 'var(--b1)'}`,
        cursor: 'pointer', textAlign: 'left', transition: 'all .12s',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}
    >
      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--s3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={15} style={{ color: accent }} />
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{desc}</div>
      </div>
    </button>
  )
}

// ─── Recent Project Row ───────────────────────────────────────────────────────
function RecentProjectRow({ project, onClick }) {
  const borderColor = {
    pending:   'var(--b2)',
    draft:     'var(--yellow)',
    importing: 'var(--ac)',
    done:      'var(--green)',
    error:     'var(--red)',
  }[project.status] || 'var(--b2)'

  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 14px', borderRadius: 'var(--r)',
        background: 'var(--s1)', border: '1px solid var(--b1)',
        borderLeft: `3px solid ${borderColor}`,
        cursor: 'pointer', textAlign: 'left', transition: 'background .1s',
        display: 'flex', alignItems: 'center', gap: 12, width: '100%',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--s2)'}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--s1)'}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }} className="truncate">{project.name}</div>
        <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--mono)', marginTop: 2 }}>
          {new Date(project.created_at).toLocaleDateString('pt-BR')} · {project.source_type || 'manual'}
        </div>
      </div>
      <StatusBadge status={project.status === 'done' ? 'done_proj' : project.status} />
    </button>
  )
}
