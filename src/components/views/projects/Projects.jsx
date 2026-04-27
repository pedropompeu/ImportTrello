import { useState } from 'react'
import { FolderKanban, Plus } from 'lucide-react'
import { useAppStore } from '../../../store/store.jsx'
import { Btn, StatusBadge, EmptyState, ProgressBar } from '../../ui/index.jsx'

export function Projects() {
  const { state, navigate, showToast, refreshProjects } = useAppStore()
  const { projects, boards } = state

  async function deleteProject(id, name) {
    if (!confirm(`Deletar projeto "${name}"? Isso remove todas as tasks locais.`)) return
    await window.api?.projects.delete({ id })
    await refreshProjects()
    showToast('success', `Projeto "${name}" deletado.`)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid var(--b1)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 800 }}>Projetos</h1>
          <p style={{ fontSize: 12, color: 'var(--t3)', marginTop: 3 }}>{projects.length} projeto(s) local(is)</p>
        </div>
        <Btn style={{ marginLeft: 'auto' }} onClick={() => navigate('importer')}>
          <Plus size={13} /> Novo Projeto
        </Btn>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {projects.length === 0 ? (
          <EmptyState
            icon={<FolderKanban size={36} />}
            title="Nenhum projeto ainda"
            description="Crie seu primeiro projeto importando tarefas ou usando um template."
            action={<Btn onClick={() => navigate('importer')}>Criar Primeiro Projeto</Btn>}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {projects.map(p => (
              <ProjectCard
                key={p.id}
                project={p}
                boards={boards}
                onOpen={() => navigate('preview', p.id)}
                onDelete={() => deleteProject(p.id, p.name)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const STATUS_BORDER = {
  pending:   'var(--b2)',
  draft:     'var(--yellow)',
  ready:     'var(--ac)',
  importing: 'var(--ac)',
  done:      'var(--green)',
  error:     'var(--red)',
}

const SOURCE_LABELS = {
  ai:       'IA',
  file:     'Arquivo',
  template: 'Template',
  manual:   'Manual',
}

function ProjectCard({ project, boards, onOpen, onDelete }) {
  const [hovered, setHovered] = useState(false)
  const board      = boards.find(b => b.id === project.board_id)
  const borderCol  = STATUS_BORDER[project.status] || 'var(--b2)'
  const tasksDone  = project.tasks_done  || 0
  const tasksTotal = project.tasks_total || 0
  const progress   = tasksTotal > 0 ? (tasksDone / tasksTotal) * 100 : 0

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onOpen}
      style={{
        borderRadius: 'var(--r)',
        background: hovered ? 'var(--s3)' : 'var(--s2)',
        border: '1px solid var(--b1)',
        borderLeft: `3px solid ${borderCol}`,
        cursor: 'pointer',
        transition: 'all .12s',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }} className="truncate">{project.name}</div>
          <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--mono)', marginTop: 3, display: 'flex', gap: 8 }}>
            <span>{board?.name || 'sem board'}</span>
            <span style={{ color: 'var(--t4)' }}>·</span>
            <span>{SOURCE_LABELS[project.source_type] || project.source_type}</span>
            <span style={{ color: 'var(--t4)' }}>·</span>
            <span>{new Date(project.created_at).toLocaleDateString('pt-BR')}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <StatusBadge status={project.status === 'done' ? 'done_proj' : project.status} />
          {hovered && (
            <Btn
              size="xs"
              variant="danger"
              onClick={e => { e.stopPropagation(); onDelete() }}
              title="Deletar projeto"
            >
              Deletar
            </Btn>
          )}
        </div>
      </div>

      {tasksTotal > 0 && (
        <div style={{ padding: '0 16px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <ProgressBar
            progress={progress}
            height={3}
            color={project.status === 'done' ? 'var(--green)' : 'var(--ac)'}
          />
          <span style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--mono)', flexShrink: 0 }}>
            {tasksDone}/{tasksTotal}
          </span>
        </div>
      )}
    </div>
  )
}

export default Projects
