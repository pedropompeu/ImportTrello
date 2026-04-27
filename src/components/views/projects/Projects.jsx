// ─── Projects.jsx ────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { useAppStore } from '../../../store/store.jsx'
import { Btn, StatusBadge, TypeBadge, EmptyState, Spinner, Modal, Input, Select, SectionLabel, Divider } from '../../ui/index.jsx'

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
        <Btn style={{ marginLeft: 'auto' }} onClick={() => navigate('importer')}>+ Novo Projeto</Btn>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {projects.length === 0 ? (
          <EmptyState icon="⬡" title="Nenhum projeto ainda"
            description="Crie seu primeiro projeto importando tarefas ou usando um template."
            action={<Btn onClick={() => navigate('importer')}>Criar Primeiro Projeto</Btn>}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {projects.map(p => (
              <ProjectCard key={p.id} project={p} boards={boards}
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

function ProjectCard({ project, boards, onOpen, onDelete }) {
  const [hovered, setHovered] = useState(false)
  const board = boards.find(b => b.id === project.board_id)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '14px 16px', borderRadius: 'var(--r)',
        background: hovered ? 'var(--s3)' : 'var(--s2)',
        border: '1px solid var(--b1)', cursor: 'pointer',
        transition: 'all .12s', display: 'flex', alignItems: 'center', gap: 12,
      }}
      onClick={onOpen}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }} className="truncate">{project.name}</div>
        <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--mono)', marginTop: 2 }}>
          {board?.name || 'sem board'} · {new Date(project.created_at).toLocaleDateString('pt-BR')}
        </div>
      </div>
      <StatusBadge status={project.status} />
      <span style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--mono)' }}>
        {project.source_type}
      </span>
      {hovered && (
        <Btn size="xs" variant="danger" onClick={e => { e.stopPropagation(); onDelete() }}>✕</Btn>
      )}
    </div>
  )
}

export default Projects
