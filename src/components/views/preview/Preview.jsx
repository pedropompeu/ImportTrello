import { useState, useEffect, useCallback, useRef } from 'react'
import { useAppStore } from '../../../store/store.jsx'
import { Btn, TypeBadge, StatusBadge, SectionLabel, Spinner, Modal, Input, Textarea, Select, Divider, ProgressBar, EmptyState } from '../../ui/index.jsx'

const TIPOS    = ['Backend', 'Frontend', 'Infra / Config', 'Testes', 'Docs', 'Mobile', 'DevOps']
const DESTINOS = ['Backlog', 'A Fazer', 'Em Progresso', 'Em Revisão', 'Em Espera', 'Concluído']

export default function Preview() {
  const { state, navigate, showToast } = useAppStore()
  const projectId = state.activeProjectId

  const [project,   setProject]   = useState(null)
  const [tasks,     setTasks]     = useState([])
  const [selected,  setSelected]  = useState(new Set())
  const [editing,   setEditing]   = useState(null)
  const [importing, setImporting] = useState(false)
  const [log,       setLog]       = useState([])
  const [showLog,   setShowLog]   = useState(false)
  const [collapsed, setCollapsed] = useState({})
  const [progress,  setProgress]  = useState(0)

  const logEndRef = useRef(null)

  // Carrega dados do projeto
  const load = useCallback(async () => {
    if (!projectId || !window.api) return
    const res = await window.api.projects.get({ id: projectId })
    if (!res?.project) return
    setProject(res.project)
    setTasks(res.tasks || [])
    
    // Auto-select pending tasks
    const pendingIds = (res.tasks || []).filter(t => t.status === 'pending').map(t => t.id)
    setSelected(new Set(pendingIds))
  }, [projectId])

  useEffect(() => { load() }, [load])

  // Scroll log to bottom
  useEffect(() => {
    if (logEndRef.current) logEndRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [log])

  // Progress listener
  useEffect(() => {
    if (!window.api) return
    const cleanup = window.api.import.onProgress((msg) => {
      setLog(prev => [...prev, { ...msg, timestamp: new Date().toLocaleTimeString() }])
      
      if (msg.type === 'card_start') {
        const idx = msg.index + 1
        setProgress((idx / msg.total) * 100)
      }

      if (msg.type === 'card_done' || msg.type === 'card_error') {
        setTasks(prev => prev.map(t => t.id === msg.taskId
          ? { ...t, status: msg.type === 'card_done' ? 'done' : 'error' }
          : t
        ))
      }
      
      if (msg.type === 'finished') {
        setImporting(false)
        setProgress(100)
        setTimeout(() => setProgress(0), 2000)
        load()
      }
    })
    return cleanup
  }, [load])

  if (!project) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <Spinner size={20} />
    </div>
  )

  // ─── Seleção ──────────────────────────────────────────────────────────────
  const pending   = tasks.filter(t => t.status === 'pending')
  const allPendingIds = pending.map(t => t.id)
  const allSelected   = allPendingIds.length > 0 && allPendingIds.every(id => selected.has(id))

  function toggleTask(id) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleSprint(label) {
    const ids = tasks.filter(t => t.sprint === label && t.status === 'pending').map(t => t.id)
    const all = ids.every(id => selected.has(id))
    setSelected(prev => { const n = new Set(prev); ids.forEach(id => all ? n.delete(id) : n.add(id)); return n })
  }
  function toggleAll() {
    setSelected(prev => allSelected ? new Set() : new Set(allPendingIds))
  }

  // ─── Edição e Criação ─────────────────────────────────────────────────────
  async function saveEdit(taskId, fields) {
    await window.api?.tasks.update({ id: taskId, ...fields })
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...fields } : t))
    setEditing(null)
    showToast('success', 'Tarefa atualizada.')
  }

  async function deleteTask(id) {
    await window.api?.tasks.delete({ id })
    setTasks(prev => prev.filter(t => t.id !== id))
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n })
  }

  async function addNewTask(sprintLabel, sprintTitle) {
    const newTask = {
      project_id: projectId,
      titulo: 'Nova Tarefa',
      sprint: sprintLabel || 'Geral',
      sprint_title: sprintTitle || 'Geral',
      tipo: 'Backend',
      destino_col: 'Backlog',
      status: 'pending',
      position: tasks.length
    }
    const res = await window.api?.tasks.create(newTask)
    if (res?.ok) {
      const taskWithId = { ...newTask, id: res.id, checkItems: [], links: [] }
      setTasks(prev => [...prev, taskWithId])
      setEditing(taskWithId)
      setSelected(prev => { const n = new Set(prev); n.add(res.id); return n })
    }
  }

  // ─── Importação ───────────────────────────────────────────────────────────
  async function startImport() {
    const taskIds = selected.size > 0 ? [...selected] : null
    if (!taskIds?.length) return showToast('info', 'Selecione pelo menos uma tarefa.')
    
    setImporting(true)
    setLog([{ type: 'info', text: 'Iniciando importação...', timestamp: new Date().toLocaleTimeString() }])
    setShowLog(true)
    setProgress(0)

    const res = await window.api?.import.start({ projectId, taskIds }) || { ok: false, error: 'API indisponível' }
    if (!res.ok) { 
      setImporting(false)
      showToast('error', res.error)
      setLog(prev => [...prev, { type: 'card_error', text: `ERRO: ${res.error}`, timestamp: new Date().toLocaleTimeString() }])
    }
  }

  // ─── Sprints agrupadas ────────────────────────────────────────────────────
  const sprintMap = {}
  tasks.forEach(t => {
    const key = t.sprint || 'Geral'
    if (!sprintMap[key]) sprintMap[key] = { label: key, titulo: t.sprint_title || key, tasks: [] }
    sprintMap[key].tasks.push(t)
  })
  const sprints = Object.values(sprintMap)

  const doneCount    = tasks.filter(t => t.status === 'done').length
  const pendingCount = tasks.filter(t => t.status === 'pending').length
  const errorCount   = tasks.filter(t => t.status === 'error').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--b1)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, background: 'var(--s1)' }}>
        <button onClick={() => navigate('projects')} style={{ color: 'var(--t3)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>←</button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 15, fontWeight: 800 }}>{project.name}</h1>
          <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--mono)', marginTop: 1 }}>
            {tasks.length} tasks · ✓{doneCount} · ○{pendingCount} {errorCount > 0 ? `· ✗${errorCount}` : ''}
          </div>
        </div>

        <StatusBadge status={project.status === 'done' ? 'done_proj' : project.status} />

        <div style={{ display: 'flex', gap: 8 }}>
          {log.length > 0 && (
            <Btn variant="subtle" size="sm" onClick={() => setShowLog(p => !p)}>
              {showLog ? 'Ocultar Log' : 'Ver Log'}
            </Btn>
          )}
          {pendingCount > 0 && (
            <Btn onClick={startImport} disabled={importing || selected.size === 0}>
              {importing ? <><Spinner size={13} /> Enviando...</> : `↑ Enviar Selecionadas (${selected.size})`}
            </Btn>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {progress > 0 && (
        <div style={{ background: 'var(--s1)', padding: '0 20px 8px 20px' }}>
          <ProgressBar progress={progress} showPercent height={6} />
        </div>
      )}

      {/* Log - Terminal Style */}
      {showLog && (
        <div style={{
          height: 180, overflowY: 'auto', padding: '12px 20px',
          background: '#000', borderBottom: '1px solid var(--b1)',
          fontFamily: 'var(--mono)', fontSize: 11, flexShrink: 0,
          color: '#aaa', boxShadow: 'inset 0 4px 12px rgba(0,0,0,.5)'
        }}>
          {log.map((e, i) => (
            <div key={i} style={{ marginBottom: 4, display: 'flex', gap: 10 }}>
              <span style={{ color: '#555' }}>[{e.timestamp}]</span>
              <span style={{
                color: e.type === 'card_done' ? '#4ade80' : 
                       e.type === 'card_error' ? '#f87171' : 
                       e.type === 'finished' ? '#fbbf24' : 
                       e.type === 'card_start' ? '#60a5fa' : '#888'
              }}>
                {e.type === 'card_done' ? 'DONE' : 
                 e.type === 'card_error' ? 'FAIL' : 
                 e.type === 'finished' ? 'FINI' : 
                 e.type === 'card_start' ? 'SEND' : 'INFO'}
              </span>
              <span style={{ color: '#ddd' }}>
                {e.titulo || e.text || (e.type === 'finished' ? `Importação finalizada: ${e.success} sucesso, ${e.failed} falha.` : '')}
                {e.error && <span style={{ color: '#f87171', marginLeft: 8 }}>— {e.error}</span>}
              </span>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      )}

      {/* Toolbar */}
      <div style={{ padding: '8px 20px', borderBottom: '1px solid var(--b1)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, background: 'var(--s2)' }}>
        <button onClick={toggleAll} style={{ background: 'none', border: 'none', color: allSelected ? 'var(--ac2)' : 'var(--t3)', cursor: 'pointer', fontSize: 16, padding: 0, display: 'flex' }}>
          {allSelected ? '☑' : '☐'}
        </button>
        <span style={{ fontSize: 11, color: 'var(--t2)', fontWeight: 600 }}>
          {selected.size} tarefas pendentes selecionadas
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
          <Btn size="xs" variant="subtle" onClick={() => addNewTask('Sprint ' + (sprints.length + 1), 'Nova Sprint')}>+ Nova Sprint</Btn>
          <button onClick={() => setCollapsed({})} style={{ fontSize: 10, color: 'var(--t3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--mono)' }}>expandir tudo</button>
        </div>
      </div>

      {/* Lista de sprints e tasks */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {tasks.length === 0 ? (
          <EmptyState 
            icon="📝" 
            title="Projeto Vazio" 
            description="Comece adicionando sua primeira tarefa manual."
            action={<Btn onClick={() => addNewTask()}>+ Criar Primeira Tarefa</Btn>}
          />
        ) : (
          sprints.map(sprint => {
            const sprintPending = sprint.tasks.filter(t => t.status === 'pending').map(t => t.id)
            const allSel = sprintPending.length > 0 && sprintPending.every(id => selected.has(id))
            const someSel = sprintPending.some(id => selected.has(id)) && !allSel
            const isCol = collapsed[sprint.label]

            return (
              <div key={sprint.label} style={{ marginBottom: 16 }}>
                {/* Sprint header */}
                <div 
                  onClick={() => setCollapsed(p => ({ ...p, [sprint.label]: !p[sprint.label] }))}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', background: 'var(--s1)',
                    border: '1px solid var(--b1)', borderRadius: 'var(--r-sm)',
                    cursor: 'pointer', position: 'sticky', top: 0, zIndex: 10
                  }}
                >
                  <button onClick={e => { e.stopPropagation(); toggleSprint(sprint.label) }}
                    style={{ background: 'none', border: 'none', color: allSel ? 'var(--ac2)' : someSel ? 'var(--ac)' : 'var(--t3)', cursor: 'pointer', fontSize: 15, padding: 0, display: 'flex' }}>
                    {allSel ? '☑' : someSel ? '⊟' : '☐'}
                  </button>
                  <span style={{ color: 'var(--t3)', fontSize: 10 }}>{isCol ? '▶' : '▼'}</span>
                  <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--ac)', fontWeight: 800 }}>{sprint.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>{sprint.titulo}</span>
                  
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
                    <Btn size="xs" variant="subtle" onClick={(e) => { e.stopPropagation(); addNewTask(sprint.label, sprint.titulo) }}>
                      + Tarefa
                    </Btn>
                    <span style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--mono)', background: 'var(--s3)', padding: '2px 6px', borderRadius: 4 }}>
                      {sprint.tasks.length} tasks
                    </span>
                  </div>
                </div>

                {!isCol && (
                  <div style={{ paddingLeft: 4, marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {sprint.tasks.map(task => (
                      <TaskRow key={task.id}
                        task={task}
                        isSelected={selected.has(task.id)}
                        onToggle={() => task.status === 'pending' && toggleTask(task.id)}
                        onEdit={() => setEditing(task)}
                        onSaveInline={(fields) => saveEdit(task.id, fields)}
                        onDelete={() => deleteTask(task.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Edit Modal */}
      {editing && (
        <TaskEditModal
          task={editing}
          onSave={saveEdit}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

// ─── Task Row ─────────────────────────────────────────────────────────────────
function TaskRow({ task, isSelected, onToggle, onEdit, onSaveInline, onDelete }) {
  const [hov, setHov] = useState(false)
  const [inlineEdit, setInlineEdit] = useState(false)
  const [tempTitle, setTempTitle] = useState(task.titulo)
  
  const isDone = task.status === 'done'
  const isErr  = task.status === 'error'
  const isImp  = task.status === 'importing'
  const isPend = task.status === 'pending'

  const handleInlineSave = () => {
    if (tempTitle.trim() && tempTitle !== task.titulo) {
      onSaveInline({ titulo: tempTitle.trim() })
    }
    setInlineEdit(false)
  }

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={isPend && !inlineEdit ? onToggle : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', borderRadius: 'var(--r-sm)',
        background: isDone ? 'rgba(34, 197, 94, 0.04)' : isSelected ? 'rgba(var(--ac-rgb), 0.08)' : hov ? 'var(--s1)' : 'transparent',
        border: `1px solid ${isSelected && isPend ? 'var(--ac)' : hov ? 'var(--b1)' : 'transparent'}`,
        cursor: isPend && !inlineEdit ? 'pointer' : 'default',
        transition: 'all .1s',
      }}
    >
      <span style={{ fontSize: 14, color: isDone ? 'var(--green)' : isErr ? 'var(--red)' : isSelected ? 'var(--ac2)' : 'var(--t3)', flexShrink: 0, display: 'flex' }}>
        {isDone ? '✓' : isErr ? '✗' : isImp ? <Spinner size={14} /> : isSelected ? '☑' : '☐'}
      </span>

      {inlineEdit ? (
        <input 
          autoFocus
          value={tempTitle}
          onChange={e => setTempTitle(e.target.value)}
          onBlur={handleInlineSave}
          onKeyDown={e => e.key === 'Enter' && handleInlineSave()}
          onClick={e => e.stopPropagation()}
          style={{
            flex: 1, background: 'var(--s2)', border: '1px solid var(--ac)',
            borderRadius: 4, color: 'var(--t1)', fontSize: 12, padding: '4px 8px',
            outline: 'none', fontFamily: 'inherit'
          }}
        />
      ) : (
        <span 
          onClick={e => {
            if (isPend) {
              e.stopPropagation()
              setInlineEdit(true)
            }
          }}
          style={{ 
            flex: 1, fontSize: 13, color: isDone ? 'var(--t3)' : 'var(--t1)', 
            textDecoration: isDone ? 'line-through' : 'none',
            fontWeight: isSelected ? 600 : 400
          }} 
          className="truncate"
        >
          {task.titulo}
        </span>
      )}

      <TypeBadge tipo={task.tipo} size="xs" />

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
        {task.checkItems?.length > 0 && (
          <span title={`${task.checkItems.length} itens`} style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--mono)' }}>
            ☑{task.checkItems.length}
          </span>
        )}
        
        {hov && isPend && !inlineEdit && (
          <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
            <button 
              onClick={onEdit} 
              title="Editar detalhes" 
              style={{ 
                background: 'var(--s3)', 
                border: '1px solid var(--b2)', 
                cursor: 'pointer', 
                padding: '3px 6px',
                borderRadius: 4,
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--t1)'
              }}
            >
              ✏️
            </button>
            <button 
              onClick={onDelete} 
              title="Excluir" 
              style={{ 
                background: 'var(--red-bg)', 
                border: '1px solid var(--red)', 
                cursor: 'pointer', 
                padding: '3px 6px',
                borderRadius: 4,
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--red)',
                fontWeight: 'bold'
              }}
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Task Edit Modal ──────────────────────────────────────────────────────────
function TaskEditModal({ task, onSave, onClose }) {
  const [titulo,     setTitulo]     = useState(task.titulo)
  const [tipo,       setTipo]       = useState(task.tipo)
  const [destino,    setDestino]    = useState(task.destino_col)
  const [desc,       setDesc]       = useState(task.desc_limpa || '')
  const [dueDate,    setDueDate]    = useState(task.due_date || '')
  const [items,      setItems]      = useState([...(task.checkItems || [])])
  const [links,      setLinks]      = useState([...(task.links || [])])
  const [newItem,    setNewItem]    = useState('')
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [newLinkLbl, setNewLinkLbl] = useState('')

  function addItem() { const t = newItem.trim(); if (t) { setItems(p => [...p, t]); setNewItem('') } }
  function addLink() {
    const v = newLinkUrl.trim()
    if (v) { setLinks(p => [...p, { type: 'url', label: newLinkLbl, value: v }]); setNewLinkUrl(''); setNewLinkLbl('') }
  }

  return (
    <Modal
      title="Editar Tarefa"
      onClose={onClose}
      width={680}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn onClick={() => onSave(task.id, { titulo, tipo, destino_col: destino, desc_limpa: desc, due_date: dueDate || null, checkItems: items, links })}>
            Salvar Alterações
          </Btn>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Input label="Título" value={titulo} onChange={e => setTitulo(e.target.value)} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <Select label="Etiqueta" value={tipo} onChange={e => setTipo(e.target.value)}
            options={TIPOS.map(t => ({ value: t, label: t }))} />
          <Select label="Lista Trello" value={destino} onChange={e => setDestino(e.target.value)}
            options={DESTINOS.map(d => ({ value: d, label: d }))} />
          <Input label="Entrega" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </div>

        <Textarea label="Descrição" rows={4} value={desc} onChange={e => setDesc(e.target.value)} />

        <Divider />

        <div>
          <SectionLabel>Checklist ({items.length})</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 150, overflowY: 'auto', marginBottom: 8, paddingRight: 4 }}>
            {items.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input value={item} onChange={e => setItems(p => p.map((x, j) => j === i ? e.target.value : x))}
                  style={{ flex: 1, padding: '6px 10px', background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: 'var(--r-sm)', color: 'var(--t1)', fontSize: 12, outline: 'none' }} />
                <button onClick={() => setItems(p => p.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer' }}>✕</button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && addItem()}
              placeholder="Adicionar item..."
              style={{ flex: 1, padding: '6px 10px', background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: 'var(--r-sm)', color: 'var(--t1)', fontSize: 12, outline: 'none' }} />
            <Btn size="sm" variant="subtle" onClick={addItem}>Add</Btn>
          </div>
        </div>

        <Divider />

        <div>
          <SectionLabel>Links ({links.length})</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 100, overflowY: 'auto', marginBottom: 8 }}>
            {links.map((link, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 8px', background: 'var(--s2)', borderRadius: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--ac)', fontWeight: 700, width: 60, overflow: 'hidden' }}>{link.label || 'LINK'}</span>
                <span style={{ flex: 1, fontSize: 11, color: 'var(--t2)' }} className="truncate">{link.value}</span>
                <button onClick={() => setLinks(p => p.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer' }}>✕</button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={newLinkLbl} onChange={e => setNewLinkLbl(e.target.value)} placeholder="Nome"
              style={{ width: 100, padding: '6px 10px', background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: 'var(--r-sm)', color: 'var(--t1)', fontSize: 12, outline: 'none' }} />
            <input value={newLinkUrl} onChange={e => setNewLinkUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && addLink()} placeholder="URL..."
              style={{ flex: 1, padding: '6px 10px', background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: 'var(--r-sm)', color: 'var(--t1)', fontSize: 12, outline: 'none' }} />
            <Btn size="sm" variant="subtle" onClick={addLink}>Add</Btn>
          </div>
        </div>
      </div>
    </Modal>
  )
}
