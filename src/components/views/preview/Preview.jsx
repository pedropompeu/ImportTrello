import { useState, useEffect, useCallback, useRef } from 'react'
import { GripVertical, Square, CheckSquare, Check, X as XIcon, Pencil, Trash2, Plus, ChevronDown, ChevronRight, Calendar, Link2, ArrowLeft } from 'lucide-react'
import { useAppStore } from '../../../store/store.jsx'
import { Btn, TypeBadge, StatusBadge, SectionLabel, Spinner, Modal, Input, Textarea, Select, Divider, ProgressBar, EmptyState } from '../../ui/index.jsx'

const TIPOS    = ['Backend', 'Frontend', 'Infra / Config', 'Testes', 'Docs', 'Mobile', 'DevOps']
const DESTINOS = ['Backlog', 'A Fazer', 'Em Progresso', 'Em Revisão', 'Em Espera', 'Concluído']

export default function Preview() {
  const { state, navigate, showToast } = useAppStore()
  const projectId = state.activeProjectId

  const [project,        setProject]        = useState(null)
  const [tasks,          setTasks]          = useState([])
  const [selected,       setSelected]       = useState(new Set())
  const [editing,        setEditing]        = useState(null)
  const [importing,      setImporting]      = useState(false)
  const [log,            setLog]            = useState([])
  const [showLog,        setShowLog]        = useState(false)
  const [collapsed,      setCollapsed]      = useState({})
  const [progress,       setProgress]       = useState(0)
  const [dropIndicator,  setDropIndicator]  = useState(null)
  const [dragOverSprint, setDragOverSprint] = useState(null)
  const [sprintEditing,  setSprintEditing]  = useState(null)
  const [currentCard,    setCurrentCard]    = useState('')

  const logEndRef = useRef(null)
  const dragRef   = useRef(null)

  // ─── Load ─────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!projectId || !window.api) return
    const res = await window.api.projects.get({ id: projectId })
    if (!res?.project) return
    setProject(res.project)
    setTasks(res.tasks || [])
    const pendingIds = (res.tasks || []).filter(t => t.status === 'pending').map(t => t.id)
    setSelected(new Set(pendingIds))
  }, [projectId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (logEndRef.current) logEndRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [log])

  useEffect(() => {
    if (!window.api) return
    const cleanup = window.api.import.onProgress((msg) => {
      setLog(prev => [...prev, { ...msg, timestamp: new Date().toLocaleTimeString() }])
      if (msg.type === 'card_start') {
        setProgress(((msg.index + 1) / msg.total) * 100)
        setCurrentCard(msg.titulo || '')
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
        setCurrentCard('')
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
  const pending       = tasks.filter(t => t.status === 'pending')
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

  // ─── Edição ───────────────────────────────────────────────────────────────
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
      project_id:   projectId,
      titulo:       'Nova Tarefa',
      sprint:       sprintLabel || 'Geral',
      sprint_title: sprintTitle || 'Geral',
      tipo:         'Backend',
      destino_col:  'Backlog',
      status:       'pending',
      position:     tasks.length,
    }
    const res = await window.api?.tasks.create(newTask)
    if (res?.ok) {
      const taskWithId = { ...newTask, id: res.id, checkItems: [], links: [] }
      setTasks(prev => [...prev, taskWithId])
      setEditing(taskWithId)
      setSelected(prev => { const n = new Set(prev); n.add(res.id); return n })
    }
  }

  // ─── Sprint rename ────────────────────────────────────────────────────────
  async function renameSprint(label, newTitle) {
    const title = newTitle.trim()
    setSprintEditing(null)
    if (!title) return
    const affected = tasks.filter(t => t.sprint === label)
    setTasks(prev => prev.map(t => t.sprint === label ? { ...t, sprint_title: title } : t))
    await Promise.all(affected.map(t => window.api?.tasks.update({ id: t.id, sprint_title: title })))
  }

  // ─── Sprint delete ────────────────────────────────────────────────────────
  async function deleteSprint(label, titulo) {
    if (!window.confirm(`Excluir a sprint "${titulo}" e todas as suas tasks?`)) return
    const ids = tasks.filter(t => t.sprint === label).map(t => t.id)
    setTasks(prev => prev.filter(t => t.sprint !== label))
    setSelected(prev => { const n = new Set(prev); ids.forEach(id => n.delete(id)); return n })
    await Promise.all(ids.map(id => window.api?.tasks.delete({ id })))
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

  // ─── Drag & Drop ──────────────────────────────────────────────────────────
  function handleDragStart(taskId, sprintLabel) {
    dragRef.current = { taskId, sprintLabel }
  }

  function clearDrag() {
    dragRef.current = null
    setDropIndicator(null)
    setDragOverSprint(null)
  }

  function handleDragOverTask(e, sprintLabel, taskId) {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setDragOverSprint(sprintLabel)
    const rect   = e.currentTarget.getBoundingClientRect()
    const before = e.clientY < rect.top + rect.height / 2
    setDropIndicator({ sprintLabel, beforeTaskId: before ? taskId : '__after_' + taskId })
  }

  function handleDragOverSprint(e, sprintLabel) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverSprint(sprintLabel)
    setDropIndicator(prev =>
      prev?.sprintLabel === sprintLabel && prev?.beforeTaskId !== '__end__'
        ? prev
        : { sprintLabel, beforeTaskId: '__end__' }
    )
  }

  async function handleDrop(e, targetSprintLabel, targetSprintTitle) {
    e.preventDefault()
    if (!dragRef.current) return
    const { taskId } = dragRef.current
    const indicator  = dropIndicator
    clearDrag()
    if (!taskId || !indicator) return

    const dragged = tasks.find(t => t.id === taskId)
    if (!dragged) return

    const sprintOrder = []
    const seenS = new Set()
    tasks.forEach(t => {
      const k = t.sprint || 'Geral'
      if (!seenS.has(k)) { seenS.add(k); sprintOrder.push(k) }
    })

    const withoutDragged = tasks.filter(t => t.id !== taskId)
    const byS = {}
    sprintOrder.forEach(l => { byS[l] = [] })
    withoutDragged.forEach(t => {
      const k = t.sprint || 'Geral'
      if (!byS[k]) byS[k] = []
      byS[k].push(t)
    })

    const targetArr = byS[targetSprintLabel] || []
    let insertIdx   = targetArr.length

    if (indicator.beforeTaskId && indicator.beforeTaskId !== '__end__') {
      const isAfter = indicator.beforeTaskId.startsWith('__after_')
      const refId   = isAfter ? indicator.beforeTaskId.slice(8) : indicator.beforeTaskId
      const idx     = targetArr.findIndex(t => t.id === refId)
      if (idx !== -1) insertIdx = isAfter ? idx + 1 : idx
    }

    const updatedDragged = { ...dragged, sprint: targetSprintLabel, sprint_title: targetSprintTitle }
    targetArr.splice(insertIdx, 0, updatedDragged)

    const newTasks = []
    sprintOrder.forEach(label => {
      if (label === targetSprintLabel) {
        targetArr.forEach((t, i) => newTasks.push({ ...t, position: i }))
      } else {
        ;(byS[label] || []).forEach(t => newTasks.push(t))
      }
    })

    setTasks(newTasks)
    const toSave = newTasks.filter(t => (t.sprint || 'Geral') === targetSprintLabel)
    await Promise.all(toSave.map(t =>
      window.api?.tasks.update({ id: t.id, sprint: t.sprint, sprint_title: t.sprint_title, position: t.position })
    ))
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
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--b1)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, background: 'var(--s1)' }}>
        <button
          onClick={() => navigate('projects')}
          style={{ color: 'var(--t3)', background: 'var(--s2)', border: '1px solid var(--b1)', cursor: 'pointer', borderRadius: 6, padding: 6, display: 'flex', transition: 'all .1s' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--t1)'; e.currentTarget.style.borderColor = 'var(--b2)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--t3)'; e.currentTarget.style.borderColor = 'var(--b1)' }}
        >
          <ArrowLeft size={14} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1)' }} className="truncate">{project.name}</h1>
          <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--mono)', marginTop: 1, display: 'flex', gap: 8 }}>
            <span>{tasks.length} tasks</span>
            {doneCount > 0    && <span style={{ color: 'var(--green)' }}>✓ {doneCount}</span>}
            {pendingCount > 0 && <span>○ {pendingCount}</span>}
            {errorCount > 0   && <span style={{ color: 'var(--red)' }}>✗ {errorCount}</span>}
          </div>
        </div>
        <StatusBadge status={project.status === 'done' ? 'done_proj' : project.status} />
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {log.length > 0 && (
            <Btn variant="subtle" size="sm" onClick={() => setShowLog(p => !p)}>
              {showLog ? 'Ocultar Log' : 'Ver Log'}
            </Btn>
          )}
          {pendingCount > 0 && (
            <Btn onClick={startImport} disabled={importing || selected.size === 0}>
              {importing
                ? <><Spinner size={13} /> Enviando...</>
                : `↑ Enviar Selecionadas (${selected.size})`}
            </Btn>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {progress > 0 && (
        <div style={{ background: 'var(--s1)', padding: '6px 20px 8px' }}>
          <ProgressBar progress={progress} showPercent height={5} />
          {currentCard && (
            <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--t3)', marginTop: 4 }}>
              Criando: {currentCard}
            </div>
          )}
        </div>
      )}

      {/* Log — terminal style */}
      {showLog && (
        <div style={{ height: 170, overflowY: 'auto', padding: '10px 20px', background: '#0d1117', borderBottom: '1px solid var(--b1)', fontFamily: 'var(--mono)', fontSize: 11, flexShrink: 0, color: '#8b949e' }}>
          {log.map((e, i) => (
            <div key={i} style={{ marginBottom: 3, display: 'flex', gap: 10 }}>
              <span style={{ color: '#484f58' }}>[{e.timestamp}]</span>
              <span style={{ color: e.type === 'card_done' ? '#3fb950' : e.type === 'card_error' ? '#f85149' : e.type === 'finished' ? '#e3b341' : e.type === 'card_start' ? '#58a6ff' : '#8b949e', fontWeight: 700, flexShrink: 0 }}>
                {e.type === 'card_done' ? 'DONE' : e.type === 'card_error' ? 'FAIL' : e.type === 'finished' ? 'DONE' : e.type === 'card_start' ? 'SEND' : 'INFO'}
              </span>
              <span style={{ color: '#c9d1d9' }}>
                {e.titulo || e.text || (e.type === 'finished' ? `Finalizado: ${e.success} sucesso, ${e.failed} falha.` : '')}
                {e.error && <span style={{ color: '#f85149', marginLeft: 8 }}>— {e.error}</span>}
              </span>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      )}

      {/* Toolbar */}
      <div style={{ padding: '8px 20px', borderBottom: '1px solid var(--b1)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, background: 'var(--s2)' }}>
        <button
          onClick={toggleAll}
          style={{ background: 'none', border: 'none', color: allSelected ? 'var(--ac2)' : 'var(--t3)', cursor: 'pointer', display: 'flex', padding: 0 }}
        >
          {allSelected ? <CheckSquare size={15} /> : <Square size={15} />}
        </button>
        <span style={{ fontSize: 11, color: 'var(--t2)', fontWeight: 500 }}>
          {selected.size > 0 ? `${selected.size} selecionadas` : 'Selecionar todas'}
        </span>
        {selected.size > 0 && (
          <button onClick={() => setSelected(new Set())} style={{ fontSize: 10, color: 'var(--t3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--mono)' }}>
            limpar
          </button>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <Btn size="xs" variant="subtle" onClick={() => addNewTask('Sprint ' + (sprints.length + 1), 'Nova Sprint')} title="Nova task em sprint separada">
            <Plus size={11} /> Nova Sprint / Task
          </Btn>
          <button
            onClick={() => setCollapsed({})}
            style={{ fontSize: 10, color: 'var(--t3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--mono)' }}
          >
            expandir tudo
          </button>
          <button
            onClick={() => {
              const all = {}
              sprints.forEach(s => { all[s.label] = true })
              setCollapsed(all)
            }}
            style={{ fontSize: 10, color: 'var(--t3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--mono)' }}
          >
            colapsar tudo
          </button>
        </div>
      </div>

      {/* Lista de sprints */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px' }}>
        {tasks.length === 0 ? (
          <EmptyState
            icon={<Plus size={36} />}
            title="Projeto vazio"
            description="Comece adicionando sua primeira tarefa manualmente."
            action={<Btn onClick={() => addNewTask()}>+ Criar Primeira Tarefa</Btn>}
          />
        ) : (
          sprints.map(sprint => {
            const sprintPending  = sprint.tasks.filter(t => t.status === 'pending').map(t => t.id)
            const allSel         = sprintPending.length > 0 && sprintPending.every(id => selected.has(id))
            const someSel        = sprintPending.some(id => selected.has(id)) && !allSel
            const isCol          = collapsed[sprint.label]
            const isEditingTitle = sprintEditing === sprint.label
            const isDragTarget   = dragOverSprint === sprint.label
            const sprintDone     = sprint.tasks.filter(t => t.status === 'done').length

            return (
              <div key={sprint.label} style={{ marginBottom: 12 }}>

                {/* Sprint header */}
                <div
                  onClick={() => !isEditingTitle && setCollapsed(p => ({ ...p, [sprint.label]: !p[sprint.label] }))}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '9px 14px',
                    background: isDragTarget ? 'var(--ac-bg)' : 'var(--s1)',
                    border: `1px solid ${isDragTarget ? 'var(--ac)' : 'var(--b1)'}`,
                    borderRadius: isCol ? 'var(--r-sm)' : 'var(--r-sm) var(--r-sm) 0 0',
                    cursor: isEditingTitle ? 'default' : 'pointer',
                    position: 'sticky', top: 0, zIndex: 10,
                    transition: 'background .1s, border-color .1s',
                  }}
                >
                  <button
                    onClick={e => { e.stopPropagation(); toggleSprint(sprint.label) }}
                    style={{ background: 'none', border: 'none', color: allSel ? 'var(--ac2)' : someSel ? 'var(--ac)' : 'var(--t3)', cursor: 'pointer', display: 'flex', padding: 0 }}
                  >
                    {allSel ? <CheckSquare size={14} /> : someSel ? <CheckSquare size={14} style={{ opacity: 0.5 }} /> : <Square size={14} />}
                  </button>

                  <span style={{ color: 'var(--t3)', display: 'flex', flexShrink: 0 }}>
                    {isCol ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                  </span>

                  <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--ac)', fontWeight: 800, flexShrink: 0 }}>
                    {sprint.label}
                  </span>

                  {isEditingTitle ? (
                    <input
                      autoFocus
                      defaultValue={sprint.titulo}
                      onBlur={e => renameSprint(sprint.label, e.target.value)}
                      onKeyDown={e => {
                        e.stopPropagation()
                        if (e.key === 'Enter')  renameSprint(sprint.label, e.target.value)
                        if (e.key === 'Escape') setSprintEditing(null)
                      }}
                      onClick={e => e.stopPropagation()}
                      style={{
                        flex: 1, fontSize: 13, fontWeight: 700, color: 'var(--t1)',
                        background: 'var(--s2)', border: '1px solid var(--ac)',
                        borderRadius: 4, padding: '2px 8px', outline: 'none', fontFamily: 'inherit',
                      }}
                    />
                  ) : (
                    <span
                      onDoubleClick={e => { e.stopPropagation(); setSprintEditing(sprint.label) }}
                      title="Duplo clique para renomear"
                      style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}
                    >
                      {sprint.titulo}
                    </span>
                  )}

                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <span style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--mono)', background: 'var(--s3)', padding: '2px 6px', borderRadius: 4 }}>
                      {sprintDone}/{sprint.tasks.length}
                    </span>
                    <Btn size="xs" variant="subtle" onClick={e => { e.stopPropagation(); addNewTask(sprint.label, sprint.titulo) }}>
                      <Plus size={10} /> Task
                    </Btn>
                    <button
                      onClick={e => { e.stopPropagation(); setSprintEditing(sprint.label) }}
                      title="Renomear sprint"
                      style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', display: 'flex', padding: 3, borderRadius: 4 }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--t1)'; e.currentTarget.style.background = 'var(--s3)' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--t3)'; e.currentTarget.style.background = 'none' }}
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); deleteSprint(sprint.label, sprint.titulo) }}
                      title="Excluir sprint"
                      style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', display: 'flex', padding: 3, borderRadius: 4 }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.background = 'var(--red-bg)' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--t3)'; e.currentTarget.style.background = 'none' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Sprint body */}
                {!isCol && (
                  <div
                    onDragOver={e => handleDragOverSprint(e, sprint.label)}
                    onDrop={e => handleDrop(e, sprint.label, sprint.titulo)}
                    onDragLeave={e => {
                      if (!e.currentTarget.contains(e.relatedTarget)) {
                        setDragOverSprint(null)
                        setDropIndicator(null)
                      }
                    }}
                    style={{
                      border: '1px solid var(--b1)', borderTop: 'none',
                      borderRadius: '0 0 var(--r-sm) var(--r-sm)',
                      padding: '4px 6px 6px', display: 'flex', flexDirection: 'column', minHeight: 8,
                      background: 'var(--bg)',
                    }}
                  >
                    {sprint.tasks.length === 0 && isDragTarget && (
                      <div style={{ height: 36, border: '2px dashed var(--ac)', borderRadius: 'var(--r-sm)', opacity: 0.5, margin: 4 }} />
                    )}

                    {sprint.tasks.map((task, idx) => {
                      const ind = dropIndicator
                      const showBefore = ind?.sprintLabel === sprint.label && ind?.beforeTaskId === task.id
                      const showAfter  = ind?.sprintLabel === sprint.label && (
                        ind?.beforeTaskId === '__after_' + task.id ||
                        (ind?.beforeTaskId === '__end__' && idx === sprint.tasks.length - 1)
                      )

                      return (
                        <div key={task.id}>
                          {showBefore && <DropLine />}
                          <div style={{ marginBottom: 2 }}>
                            <TaskRow
                              task={task}
                              isSelected={selected.has(task.id)}
                              onToggle={() => task.status === 'pending' && toggleTask(task.id)}
                              onEdit={() => setEditing(task)}
                              onSaveInline={fields => saveEdit(task.id, fields)}
                              onDelete={() => deleteTask(task.id)}
                              onDragStart={() => handleDragStart(task.id, sprint.label)}
                              onDragEnd={clearDrag}
                              onDragOver={e => handleDragOverTask(e, sprint.label, task.id)}
                            />
                          </div>
                          {showAfter && <DropLine />}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Edit Modal */}
      {editing && (
        <TaskEditModal task={editing} sprints={sprints} onSave={saveEdit} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}

// ─── Drop Line ────────────────────────────────────────────────────────────────
function DropLine() {
  return (
    <div style={{
      height: 2, background: 'var(--ac)', borderRadius: 99,
      margin: '2px 0', boxShadow: '0 0 6px var(--ac)',
    }} />
  )
}

// ─── Task Row ─────────────────────────────────────────────────────────────────
function TaskRow({ task, isSelected, onToggle, onEdit, onSaveInline, onDelete, onDragStart, onDragEnd, onDragOver }) {
  const [hov,        setHov]        = useState(false)
  const [dragging,   setDragging]   = useState(false)
  const [inlineEdit, setInlineEdit] = useState(false)
  const [tempTitle,  setTempTitle]  = useState(task.titulo)

  const isDone = task.status === 'done'
  const isErr  = task.status === 'error'
  const isImp  = task.status === 'importing'
  const isPend = task.status === 'pending'

  function handleInlineSave() {
    if (tempTitle.trim() && tempTitle !== task.titulo) onSaveInline({ titulo: tempTitle.trim() })
    setInlineEdit(false)
  }

  return (
    <div
      draggable={isPend}
      onDragStart={e => {
        if (!isPend) { e.preventDefault(); return }
        e.dataTransfer.effectAllowed = 'move'
        setDragging(true)
        onDragStart()
      }}
      onDragEnd={() => { setDragging(false); onDragEnd() }}
      onDragOver={onDragOver}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={isPend && !inlineEdit ? onToggle : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '9px 12px', borderRadius: 'var(--r-sm)',
        background: isDone
          ? 'rgba(52,201,138,0.04)'
          : isErr
          ? 'rgba(240,92,110,0.04)'
          : isSelected
          ? 'rgba(79,110,247,0.07)'
          : hov
          ? 'var(--s1)'
          : 'transparent',
        border: `1px solid ${isErr ? 'rgba(240,92,110,.2)' : isSelected && isPend ? 'rgba(79,110,247,.25)' : hov ? 'var(--b1)' : 'transparent'}`,
        cursor: dragging ? 'grabbing' : isPend && !inlineEdit ? 'pointer' : 'default',
        opacity: dragging ? 0.35 : 1,
        transition: 'all .1s',
      }}
    >
      {/* Grip handle */}
      <span style={{ display: 'flex', flexShrink: 0, opacity: hov && isPend ? 1 : 0, transition: 'opacity .1s', cursor: isPend ? 'grab' : 'default' }}>
        <GripVertical size={14} style={{ color: 'var(--t3)' }} />
      </span>

      {/* Status indicator */}
      <span style={{ flexShrink: 0, display: 'flex', color: isDone ? 'var(--green)' : isErr ? 'var(--red)' : isSelected ? 'var(--ac2)' : 'var(--t3)' }}>
        {isDone
          ? <Check size={14} />
          : isErr
          ? <XIcon size={14} />
          : isImp
          ? <Spinner size={14} />
          : isSelected
          ? <CheckSquare size={14} />
          : <Square size={14} />}
      </span>

      {/* Title */}
      {inlineEdit ? (
        <input
          autoFocus
          value={tempTitle}
          onChange={e => setTempTitle(e.target.value)}
          onBlur={handleInlineSave}
          onKeyDown={e => {
            if (e.key === 'Enter')  handleInlineSave()
            if (e.key === 'Escape') { setTempTitle(task.titulo); setInlineEdit(false) }
            e.stopPropagation()
          }}
          onClick={e => e.stopPropagation()}
          style={{
            flex: 1, background: 'var(--s2)', border: '1px solid var(--ac)',
            borderRadius: 4, color: 'var(--t1)', fontSize: 12,
            padding: '4px 8px', outline: 'none', fontFamily: 'inherit',
          }}
        />
      ) : (
        <span
          onClick={e => { if (isPend) { e.stopPropagation(); setInlineEdit(true) } }}
          title={isPend ? 'Clique para editar título' : undefined}
          style={{
            flex: 1, fontSize: 13,
            color: isDone ? 'var(--t3)' : isErr ? 'var(--t2)' : 'var(--t1)',
            textDecoration: isDone ? 'line-through' : 'none',
            fontWeight: isSelected ? 600 : 400,
          }}
          className="truncate"
        >
          {task.titulo}
        </span>
      )}

      <TypeBadge tipo={task.tipo} size="xs" />

      {/* Meta icons */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
        {task.checkItems?.length > 0 && (
          <span title={`${task.checkItems.length} itens`} style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--mono)', display: 'flex', alignItems: 'center', gap: 3 }}>
            <CheckSquare size={10} /> {task.checkItems.length}
          </span>
        )}
        {task.due_date && (
          <span title={task.due_date} style={{ fontSize: 10, color: 'var(--yellow)', fontFamily: 'var(--mono)', display: 'flex', alignItems: 'center', gap: 3 }}>
            <Calendar size={10} /> {task.due_date}
          </span>
        )}
        {task.links?.length > 0 && (
          <span title={`${task.links.length} links`} style={{ fontSize: 10, color: 'var(--ac2)', fontFamily: 'var(--mono)', display: 'flex', alignItems: 'center', gap: 3 }}>
            <Link2 size={10} /> {task.links.length}
          </span>
        )}

        {hov && isPend && !inlineEdit && (
          <div style={{ display: 'flex', gap: 3 }} onClick={e => e.stopPropagation()}>
            <button
              onClick={onEdit}
              title="Editar detalhes"
              style={{ background: 'var(--s3)', border: '1px solid var(--b2)', cursor: 'pointer', padding: '3px 6px', borderRadius: 4, display: 'flex', alignItems: 'center', color: 'var(--t2)', transition: 'all .1s' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--t1)'; e.currentTarget.style.borderColor = 'var(--b3)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--t2)'; e.currentTarget.style.borderColor = 'var(--b2)' }}
            >
              <Pencil size={11} />
            </button>
            <button
              onClick={onDelete}
              title="Excluir"
              style={{ background: 'var(--red-bg)', border: '1px solid rgba(240,92,110,.2)', cursor: 'pointer', padding: '3px 6px', borderRadius: 4, display: 'flex', alignItems: 'center', color: 'var(--red)', transition: 'all .1s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--red)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(240,92,110,.2)'}
            >
              <XIcon size={11} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Task Edit Modal ──────────────────────────────────────────────────────────
function TaskEditModal({ task, sprints, onSave, onClose }) {
  const [titulo,        setTitulo]        = useState(task.titulo)
  const [tipo,          setTipo]          = useState(task.tipo)
  const [destino,       setDestino]       = useState(task.destino_col)
  const [desc,          setDesc]          = useState(task.desc_limpa || '')
  const [dueDate,       setDueDate]       = useState(task.due_date || '')
  const [items,         setItems]         = useState([...(task.checkItems || [])])
  const [links,         setLinks]         = useState([...(task.links || [])])
  const [newItem,       setNewItem]       = useState('')
  const [newLinkUrl,    setNewLinkUrl]    = useState('')
  const [newLinkLbl,    setNewLinkLbl]    = useState('')
  const [sprintLabel,   setSprintLabel]   = useState(task.sprint || 'Geral')
  const [sprintTitle,   setSprintTitle]   = useState(task.sprint_title || task.sprint || 'Geral')
  const [newSprintName, setNewSprintName] = useState('')
  const [showNewSprint, setShowNewSprint] = useState(false)
  const [position,      setPosition]      = useState(task.position ?? 0)

  const sprintOptions = (sprints || []).map(s => ({ value: s.label, label: `${s.label} — ${s.titulo}` }))
  const NOVA_SPRINT   = '__nova__'

  function handleSprintChange(e) {
    const val = e.target.value
    if (val === NOVA_SPRINT) {
      setShowNewSprint(true)
    } else {
      setShowNewSprint(false)
      setSprintLabel(val)
      const found = (sprints || []).find(s => s.label === val)
      setSprintTitle(found?.titulo || val)
    }
  }

  function confirmNewSprint() {
    const name = newSprintName.trim()
    if (!name) return
    setSprintLabel(name)
    setSprintTitle(name)
    setShowNewSprint(false)
  }

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
          <Btn onClick={() => onSave(task.id, {
            titulo, tipo, destino_col: destino,
            desc_limpa: desc, due_date: dueDate || null,
            checkItems: items, links,
            sprint: sprintLabel, sprint_title: sprintTitle,
            position: Number(position),
          })}>
            Salvar Alterações
          </Btn>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Input label="Título" value={titulo} onChange={e => setTitulo(e.target.value)} />

        {/* Tipo com pills coloridas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.6px', fontFamily: 'var(--mono)' }}>Tipo</label>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {TIPOS.map(t => (
              <button
                key={t}
                onClick={() => setTipo(t)}
                style={{
                  padding: '3px 10px', borderRadius: 4, fontSize: 11, cursor: 'pointer',
                  fontFamily: 'var(--mono)', fontWeight: 500,
                  background: tipo === t ? 'var(--ac-bg)' : 'var(--s3)',
                  border: `1px solid ${tipo === t ? 'var(--ac)' : 'var(--b1)'}`,
                  color: tipo === t ? 'var(--ac2)' : 'var(--t2)',
                  transition: 'all .1s',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Select label="Lista Trello" value={destino} onChange={e => setDestino(e.target.value)}
            options={DESTINOS.map(d => ({ value: d, label: d }))} />
          <Input label="Entrega" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </div>

        {/* Sprint */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: 'var(--mono)' }}>Sprint</label>
            {showNewSprint ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  autoFocus
                  value={newSprintName}
                  onChange={e => setNewSprintName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') confirmNewSprint(); if (e.key === 'Escape') setShowNewSprint(false) }}
                  placeholder="Nome da nova sprint..."
                  style={{ flex: 1, padding: '8px 11px', background: 'var(--s2)', border: '1px solid var(--ac)', borderRadius: 'var(--r-sm)', color: 'var(--t1)', fontSize: 12, outline: 'none' }}
                />
                <Btn size="sm" onClick={confirmNewSprint}>OK</Btn>
                <Btn size="sm" variant="ghost" onClick={() => setShowNewSprint(false)}><XIcon size={12} /></Btn>
              </div>
            ) : (
              <select
                value={sprintLabel}
                onChange={handleSprintChange}
                style={{ width: '100%', padding: '8px 11px', background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: 'var(--r-sm)', color: 'var(--t1)', fontSize: 12, cursor: 'pointer', outline: 'none' }}
              >
                {sprintOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                <option value={NOVA_SPRINT}>+ Nova Sprint...</option>
              </select>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: 'var(--mono)' }}>Posição</label>
            <input
              type="number" min="0" value={position} onChange={e => setPosition(e.target.value)}
              style={{ width: 70, padding: '8px 11px', background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: 'var(--r-sm)', color: 'var(--t1)', fontSize: 12, outline: 'none' }}
            />
          </div>
        </div>

        <Textarea label="Descrição" rows={4} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Suporte a Markdown..." />

        <Divider />

        {/* Checklist */}
        <div>
          <SectionLabel>Checklist ({items.length})</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 140, overflowY: 'auto', marginBottom: 8 }}>
            {items.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  value={item}
                  onChange={e => setItems(p => p.map((x, j) => j === i ? e.target.value : x))}
                  style={{ flex: 1, padding: '6px 10px', background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: 'var(--r-sm)', color: 'var(--t1)', fontSize: 12, outline: 'none' }}
                />
                <button
                  onClick={() => setItems(p => p.filter((_, j) => j !== i))}
                  style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', display: 'flex' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--t3)'}
                >
                  <XIcon size={13} />
                </button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={newItem} onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem()}
              placeholder="Adicionar item..."
              style={{ flex: 1, padding: '6px 10px', background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: 'var(--r-sm)', color: 'var(--t1)', fontSize: 12, outline: 'none' }}
            />
            <Btn size="sm" variant="subtle" onClick={addItem}>Add</Btn>
          </div>
        </div>

        <Divider />

        {/* Links */}
        <div>
          <SectionLabel>Links / Anexos ({links.length})</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 100, overflowY: 'auto', marginBottom: 8 }}>
            {links.map((link, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '5px 10px', background: 'var(--s2)', borderRadius: 4 }}>
                <Link2 size={11} style={{ color: 'var(--ac)', flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ac2)', width: 60, overflow: 'hidden' }} className="truncate">{link.label || 'Link'}</span>
                <span style={{ flex: 1, fontSize: 11, color: 'var(--t2)' }} className="truncate">{link.value}</span>
                <button
                  onClick={() => setLinks(p => p.filter((_, j) => j !== i))}
                  style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', display: 'flex' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--t3)'}
                >
                  <XIcon size={12} />
                </button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={newLinkLbl} onChange={e => setNewLinkLbl(e.target.value)} placeholder="Nome"
              style={{ width: 100, padding: '6px 10px', background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: 'var(--r-sm)', color: 'var(--t1)', fontSize: 12, outline: 'none' }}
            />
            <input
              value={newLinkUrl} onChange={e => setNewLinkUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addLink()} placeholder="https://..."
              style={{ flex: 1, padding: '6px 10px', background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: 'var(--r-sm)', color: 'var(--t1)', fontSize: 12, outline: 'none' }}
            />
            <Btn size="sm" variant="subtle" onClick={addLink}>Add</Btn>
          </div>
        </div>
      </div>
    </Modal>
  )
}
