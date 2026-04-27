import { useState, useRef } from 'react'
import { useAppStore } from '../../../store/store.jsx'
import { Btn, Input, Textarea, Select, SectionLabel, Divider, Spinner, EmptyState, TypeBadge } from '../../ui/index.jsx'

const STEPS = ['fonte', 'board', 'preview']

export default function Importer() {
  const { state, navigate, showToast, refreshProjects } = useAppStore()
  const { boards, templates, aiProviders } = state

  const [step,      setStep]      = useState('fonte')   // fonte | board | preview
  const [source,    setSource]    = useState('ai')      // ai | file | template | manual
  const [parsed,    setParsed]    = useState(null)      // resultado do parse/IA
  const [boardId,   setBoardId]   = useState(boards[0]?.id || '')
  const [projName,  setProjName]  = useState('')
  const [loading,   setLoading]   = useState(false)

  // IA state
  const [aiText,    setAiText]    = useState('')

  // Template state
  const [tplId,     setTplId]     = useState(templates[0]?.id || '')

  const aiActive = aiProviders.find(p => p.is_active)

  // ─── Handlers ──────────────────────────────────────────────────────────────
  async function handleAIGenerate() {
    if (!aiText.trim()) return
    setLoading(true)
    try {
      const res = await window.api?.ai.generateTasks({ text: aiText }) || { ok: false, error: 'API não disponível' }
      if (!res.ok) { showToast('error', res.error); return }
      setParsed(res.result)
      const totalTasks = res.result.sprints?.reduce((s, sp) => s + sp.tasks.length, 0) || 0
      showToast('success', `IA gerou ${totalTasks} tasks em ${res.result.sprints?.length || 0} sprints!`)
      setStep('board')
    } catch (e) {
      showToast('error', e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleFileImport() {
    setLoading(true)
    try {
      const res = await window.api?.parse.openFileDialog() || { canceled: true }
      if (res.canceled) return
      if (!res.ok) { showToast('error', res.error); return }
      setParsed(res.parsed)
      const total = res.parsed.sprints?.reduce((s, sp) => s + sp.tasks.length, 0) || 0
      showToast('success', `${res.fileName} — ${total} tasks encontradas.`)
      setStep('board')
    } finally {
      setLoading(false)
    }
  }

  async function handleTemplateSelect() {
    if (!tplId) return
    const tasks = await window.api?.templates.getTasks({ templateId: tplId }) || []
    // Converte para o formato de parsed
    const grouped = {}
    tasks.forEach(t => {
      const key = t.sprint || 'Geral'
      if (!grouped[key]) grouped[key] = { label: key, titulo: t.sprint_title || key, tasks: [] }
      grouped[key].tasks.push({
        titulo:      t.titulo,
        tipo:        t.tipo,
        destino_col: t.destino_col,
        desc_limpa:  t.desc_template || '',
        checkItems:  JSON.parse(t.checklist || '[]'),
        links:       [],
      })
    })
    setParsed({ sprints: Object.values(grouped) })
    setStep('board')
  }

  async function handleCreate() {
    if (!projName.trim() || !boardId) {
      showToast('error', 'Informe o nome do projeto e selecione um board.')
      return
    }
    setLoading(true)
    try {
      const { id: projectId } = await window.api?.projects.create({
        name:       projName,
        board_id:   boardId,
        source_type: source,
      }) || {}

      if (!projectId) { showToast('error', 'Erro ao criar projeto.'); return }

      await window.api?.parse.importToProject({ projectId, parsed })
      await refreshProjects()
      showToast('success', `Projeto "${projName}" criado com sucesso!`)
      navigate('projects', projectId)
    } finally {
      setLoading(false)
    }
  }

  async function downloadTemplate(format) {
    const res = await window.api?.parse.getTemplate({ format }) || { ok: false }
    if (!res.ok) return
    await window.api?.app.saveFile({ content: res.content, defaultName: `template${res.ext}`, ext: res.ext })
  }

  async function fetchBoards() {
    setLoading(true)
    try {
      const res = await window.api?.boards.fetchFromTrello() || { ok: false, error: 'API não disponível' }
      if (!res.ok) showToast('error', res.error || 'Erro ao buscar boards')
      else {
        showToast('success', `${res.boards.length} boards encontrados.`)
        const local = await window.api?.boards.getLocal()
        if (local && setBoardId) setBoardId(local[0]?.id || '')
      }
    } finally {
      setLoading(false)
    }
  }

  const totalTasks = parsed?.sprints?.reduce((s, sp) => s + sp.tasks.length, 0) || 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid var(--b1)', flexShrink: 0 }}>
        <h1 style={{ fontSize: 16, fontWeight: 800 }}>Importar Projeto</h1>
        <p style={{ fontSize: 12, color: 'var(--t3)', marginTop: 3 }}>
          Gere tarefas com IA, importe arquivo ou use um template.
        </p>
      </div>

      {/* Steps */}
      <div style={{ padding: '0 24px', borderBottom: '1px solid var(--b1)', display: 'flex', gap: 0, flexShrink: 0 }}>
        {[['fonte','1. Fonte'], ['board','2. Board & Nome'], ['preview','3. Preview']].map(([s, label]) => (
          <div key={s} style={{
            padding: '9px 14px', fontSize: 11, fontFamily: 'var(--mono)',
            color: step === s ? 'var(--ac2)' : parsed && s !== 'fonte' ? 'var(--t2)' : 'var(--t3)',
            borderBottom: `2px solid ${step === s ? 'var(--ac)' : 'transparent'}`,
            cursor: 'pointer', marginBottom: -1,
          }} onClick={() => { if (s === 'fonte' || parsed) setStep(s) }}>
            {label}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

        {/* ── Step 1: Fonte ─────────────────────────────────────────────────── */}
        {step === 'fonte' && (
          <div style={{ maxWidth: 640 }} className="anim-fade">

            {/* Seletor de fonte */}
            <SectionLabel>Escolha a Fonte</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 24 }}>
              {[
                { id: 'ai',       icon: '🤖', label: 'Gerar com IA',    sub: 'cole um texto' },
                { id: 'file',     icon: '📁', label: 'Importar Arquivo', sub: 'JSON, CSV, XLSX' },
                { id: 'template', icon: '📋', label: 'Template',         sub: 'projetos prontos' },
                { id: 'manual',   icon: '✏️',  label: 'Em branco',        sub: 'criar do zero' },
              ].map(opt => (
                <button key={opt.id} onClick={() => setSource(opt.id)} style={{
                  padding: '14px 10px', borderRadius: 'var(--r)', textAlign: 'center',
                  background: source === opt.id ? 'var(--ac-bg)' : 'var(--s2)',
                  border: `1px solid ${source === opt.id ? 'var(--ac)' : 'var(--b1)'}`,
                  cursor: 'pointer', transition: 'all .12s',
                }}>
                  <div style={{ fontSize: 22, marginBottom: 5 }}>{opt.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: source === opt.id ? 'var(--ac2)' : 'var(--t1)' }}>{opt.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--mono)', marginTop: 2 }}>{opt.sub}</div>
                </button>
              ))}
            </div>

            <Divider />

            {/* IA */}
            {source === 'ai' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} className="anim-fade">
                <SectionLabel>Descreva seu Projeto</SectionLabel>
                {!aiActive ? (
                  <div style={{ padding: 14, background: 'var(--yellow-bg)', border: '1px solid var(--yellow)', borderRadius: 'var(--r)', fontSize: 12, color: 'var(--yellow)' }}>
                    ⚠ Nenhum provider de IA ativo. Configure em <strong>Configurações → IA</strong>.
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: 'var(--green)', fontFamily: 'var(--mono)' }}>
                    ● Usando: {aiActive.name} / {aiActive.model}
                  </div>
                )}
                <Textarea
                  label="Texto do Projeto"
                  rows={10}
                  value={aiText}
                  onChange={e => setAiText(e.target.value)}
                  placeholder={`Cole aqui qualquer descrição de projeto. Exemplos:\n\n"Preciso criar um app de finanças pessoais com controle de gastos, orçamento mensal e cartão de crédito. Backend em NestJS, frontend em React."\n\n"Estou escrevendo um livro de desenvolvimento pessoal com 12 capítulos, cada um com exercícios práticos e resumos."`}
                />
                <Btn onClick={handleAIGenerate} disabled={!aiText.trim() || loading || !aiActive}>
                  {loading ? <><Spinner size={13} /> Gerando tasks...</> : '✦ Gerar Tasks com IA'}
                </Btn>
              </div>
            )}

            {/* File */}
            {source === 'file' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} className="anim-fade">
                <SectionLabel>Importar Arquivo</SectionLabel>
                <div style={{ padding: 20, background: 'var(--s2)', border: '2px dashed var(--b2)', borderRadius: 'var(--r)', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>JSON, CSV ou Excel</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 14 }}>Arraste um arquivo ou clique para selecionar</div>
                  <Btn onClick={handleFileImport} disabled={loading}>
                    {loading ? <><Spinner size={13} /> Importando...</> : 'Selecionar Arquivo'}
                  </Btn>
                </div>
                <div style={{ fontSize: 11, color: 'var(--t3)' }}>
                  Baixe um template de exemplo:
                  <button onClick={() => downloadTemplate('json')} style={{ color: 'var(--ac2)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, marginLeft: 6 }}>JSON</button>
                  <span style={{ color: 'var(--t4)' }}> · </span>
                  <button onClick={() => downloadTemplate('csv')} style={{ color: 'var(--ac2)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11 }}>CSV</button>
                </div>
              </div>
            )}

            {/* Template */}
            {source === 'template' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} className="anim-fade">
                <SectionLabel>Escolha um Template</SectionLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {templates.map(tpl => (
                    <button key={tpl.id} onClick={() => setTplId(tpl.id)} style={{
                      padding: '12px 14px', borderRadius: 'var(--r)',
                      background: tplId === tpl.id ? 'var(--ac-bg)' : 'var(--s2)',
                      border: `1px solid ${tplId === tpl.id ? 'var(--ac)' : 'var(--b1)'}`,
                      display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left',
                    }}>
                      <span style={{ fontSize: 22 }}>{tpl.icon}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: tplId === tpl.id ? 'var(--ac2)' : 'var(--t1)' }}>{tpl.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--t3)' }}>{tpl.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
                <Btn onClick={handleTemplateSelect} disabled={!tplId}>Usar Template →</Btn>
              </div>
            )}

            {/* Manual */}
            {source === 'manual' && (
              <div className="anim-fade">
                <EmptyState icon="✏️" title="Projeto em branco"
                  description="Um projeto vazio será criado. Você adiciona as tasks manualmente depois."
                  action={<Btn onClick={() => { setParsed({ sprints: [] }); setStep('board') }}>Continuar →</Btn>}
                />
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Board & Nome ───────────────────────────────────────────── */}
        {step === 'board' && (
          <div style={{ maxWidth: 500 }} className="anim-fade">
            <SectionLabel>Detalhes do Projeto</SectionLabel>

            {parsed && totalTasks > 0 && (
              <div style={{ padding: '10px 14px', marginBottom: 16, background: 'var(--green-bg)', border: '1px solid var(--green)', borderRadius: 'var(--r)', fontSize: 12, color: 'var(--green)' }}>
                ✓ {totalTasks} tasks em {parsed.sprints?.length || 0} sprint(s) prontas para importar
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Input
                label="Nome do Projeto"
                value={projName}
                onChange={e => setProjName(e.target.value)}
                placeholder="Ex: App FinancialManager v1"
              />

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <SectionLabel style={{ marginBottom: 0 }}>Board de Destino</SectionLabel>
                  <button onClick={fetchBoards} style={{ fontSize: 10, color: 'var(--ac2)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--mono)' }}>
                    {loading ? '...' : '↻ Buscar boards'}
                  </button>
                </div>

                {boards.length === 0 ? (
                  <div style={{ padding: 12, background: 'var(--yellow-bg)', border: '1px solid var(--yellow)', borderRadius: 'var(--r)', fontSize: 12, color: 'var(--yellow)' }}>
                    Nenhum board encontrado. Configure as credenciais do Trello e clique em "Buscar boards".
                  </div>
                ) : (
                  <Select
                    options={boards.map(b => ({ value: b.id, label: b.name }))}
                    value={boardId}
                    onChange={e => setBoardId(e.target.value)}
                  />
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <Btn variant="ghost" onClick={() => setStep('fonte')}>← Voltar</Btn>
                <Btn onClick={() => setStep('preview')} disabled={!projName.trim() || !boardId}>
                  Ver Preview →
                </Btn>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Preview ────────────────────────────────────────────────── */}
        {step === 'preview' && parsed && (
          <div className="anim-fade">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <SectionLabel style={{ marginBottom: 2 }}>Preview — {projName}</SectionLabel>
                <span style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--mono)' }}>
                  {totalTasks} tasks · {parsed.sprints?.length} sprints
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn variant="ghost" onClick={() => setStep('board')}>← Voltar</Btn>
                <Btn onClick={handleCreate} disabled={loading || !projName || !boardId}>
                  {loading ? <><Spinner size={13} /> Criando...</> : `Criar Projeto (${totalTasks} tasks)`}
                </Btn>
              </div>
            </div>

            {totalTasks === 0
              ? <EmptyState icon="✏️" title="Projeto em branco"
                  description="O projeto será criado vazio. As tasks serão adicionadas manualmente na próxima tela." />
              : <PreviewList
                  sprints={parsed.sprints || []}
                  onChange={newSprints => setParsed(p => ({ ...p, sprints: newSprints }))}
                />
            }
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Preview expandível e editável ───────────────────────────────────────────
function PreviewList({ sprints, onChange }) {
  const [expanded,      setExpanded]      = useState(new Set(sprints.map(s => s.label)))
  const [dropTarget,    setDropTarget]    = useState(null) // { si, ti, before }
  const [hovTask,       setHovTask]       = useState(null) // { si, ti }
  const [editingTask,   setEditingTask]   = useState(null) // { si, ti }
  const [editTitle,     setEditTitle]     = useState('')
  const [editingSprint, setEditingSprint] = useState(null) // si (index)
  const [editSprintTit, setEditSprintTit] = useState('')
  const dragRef = useRef(null) // { si, ti }

  const toggle = label => setExpanded(prev => {
    const n = new Set(prev); n.has(label) ? n.delete(label) : n.add(label); return n
  })

  function clearDrag() { dragRef.current = null; setDropTarget(null) }

  function handleDragOverTask(e, si, ti) {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    const rect   = e.currentTarget.getBoundingClientRect()
    const before = e.clientY < rect.top + rect.height / 2
    setDropTarget({ si, ti, before })
  }

  function handleDropOnTask(e, targetSi, targetTi) {
    e.preventDefault()
    e.stopPropagation()
    if (!dragRef.current) return
    const { si: fromSi, ti: fromTi } = dragRef.current
    const rect   = e.currentTarget.getBoundingClientRect()
    const before = e.clientY < rect.top + rect.height / 2
    clearDrag()
    if (fromSi === targetSi && fromTi === targetTi) return

    const next = sprints.map(s => ({ ...s, tasks: [...s.tasks] }))
    const [moved] = next[fromSi].tasks.splice(fromTi, 1)

    let insertIdx
    if (fromSi === targetSi) {
      const adj = fromTi < targetTi ? targetTi - 1 : targetTi
      insertIdx  = before ? adj : adj + 1
    } else {
      insertIdx = before ? targetTi : targetTi + 1
    }
    next[targetSi].tasks.splice(insertIdx, 0, moved)
    onChange?.(next)
  }

  function handleDropOnSprint(e, si) {
    e.preventDefault()
    if (!dragRef.current) return
    const { si: fromSi, ti: fromTi } = dragRef.current
    clearDrag()
    const next = sprints.map(s => ({ ...s, tasks: [...s.tasks] }))
    const [moved] = next[fromSi].tasks.splice(fromTi, 1)
    next[si].tasks.push(moved)
    onChange?.(next)
  }

  function saveTaskTitle(si, ti) {
    const title = editTitle.trim()
    setEditingTask(null)
    if (!title) return
    const next = sprints.map((s, i) =>
      i !== si ? s : { ...s, tasks: s.tasks.map((t, j) => j !== ti ? t : { ...t, titulo: title }) }
    )
    onChange?.(next)
  }

  function saveSprintTitle(si) {
    const title = editSprintTit.trim()
    setEditingSprint(null)
    if (!title) return
    const next = sprints.map((s, i) => i !== si ? s : { ...s, titulo: title })
    onChange?.(next)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {sprints.map((sprint, si) => (
        <div
          key={sprint.label}
          style={{ border: '1px solid var(--b1)', borderRadius: 'var(--r)', overflow: 'hidden' }}
          onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
          onDrop={e => handleDropOnSprint(e, si)}
        >
          {/* Sprint header */}
          <div style={{ width: '100%', padding: '10px 14px', background: 'var(--s2)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => toggle(sprint.label)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', fontSize: 12, display: 'flex', padding: 0, flexShrink: 0 }}
            >
              {expanded.has(sprint.label) ? '▾' : '▸'}
            </button>
            <span style={{ fontSize: 11, color: 'var(--ac2)', fontFamily: 'var(--mono)', fontWeight: 600, flexShrink: 0 }}>{sprint.label}</span>

            {editingSprint === si ? (
              <input
                autoFocus
                value={editSprintTit}
                onChange={e => setEditSprintTit(e.target.value)}
                onBlur={() => saveSprintTitle(si)}
                onKeyDown={e => {
                  if (e.key === 'Enter')  saveSprintTitle(si)
                  if (e.key === 'Escape') setEditingSprint(null)
                  e.stopPropagation()
                }}
                onClick={e => e.stopPropagation()}
                style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--t1)', background: 'var(--s3)', border: '1px solid var(--ac)', borderRadius: 4, padding: '2px 8px', outline: 'none', fontFamily: 'inherit' }}
              />
            ) : (
              <span
                onDoubleClick={() => { setEditingSprint(si); setEditSprintTit(sprint.titulo) }}
                title="Duplo clique para renomear"
                style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--t1)', cursor: 'text' }}
              >
                {sprint.titulo}
              </span>
            )}

            <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--mono)', flexShrink: 0 }}>{sprint.tasks?.length} tasks</span>
            <button
              onClick={() => {
                if (!window.confirm(`Excluir a sprint "${sprint.titulo}" e todas as suas ${sprint.tasks?.length} tasks?`)) return
                onChange?.(sprints.filter((_, i) => i !== si))
              }}
              title="Excluir sprint"
              style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 13, padding: '0 2px', display: 'flex', alignItems: 'center', flexShrink: 0 }}
            >✕</button>
          </div>

          {/* Tasks */}
          {expanded.has(sprint.label) && (
            <div style={{ padding: '4px 8px 8px', display: 'flex', flexDirection: 'column' }}>
              {(sprint.tasks || []).map((task, ti) => {
                const isDragSrc  = dragRef.current?.si === si && dragRef.current?.ti === ti
                const isHov      = hovTask?.si === si && hovTask?.ti === ti
                const isEditing  = editingTask?.si === si && editingTask?.ti === ti
                const showBefore = dropTarget?.si === si && dropTarget?.ti === ti && dropTarget?.before
                const showAfter  = dropTarget?.si === si && dropTarget?.ti === ti && !dropTarget?.before

                return (
                  <div key={ti}>
                    {showBefore && <DropLine />}
                    <div
                      draggable
                      onDragStart={() => { dragRef.current = { si, ti } }}
                      onDragEnd={clearDrag}
                      onDragOver={e => handleDragOverTask(e, si, ti)}
                      onDrop={e => handleDropOnTask(e, si, ti)}
                      onMouseEnter={() => setHovTask({ si, ti })}
                      onMouseLeave={() => setHovTask(null)}
                      style={{
                        padding: '8px 10px', borderRadius: 'var(--r-sm)', marginBottom: 3,
                        background: 'var(--s1)', display: 'flex', alignItems: 'center', gap: 8,
                        opacity: isDragSrc ? 0.4 : 1, transition: 'opacity .1s',
                      }}
                    >
                      {/* Grip */}
                      <span style={{ fontSize: 13, color: 'var(--t3)', cursor: 'grab', opacity: isHov ? 1 : 0, flexShrink: 0, transition: 'opacity .1s', userSelect: 'none' }}>⠿</span>

                      {/* Título editável */}
                      {isEditing ? (
                        <input
                          autoFocus
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          onBlur={() => saveTaskTitle(si, ti)}
                          onKeyDown={e => {
                            if (e.key === 'Enter')  saveTaskTitle(si, ti)
                            if (e.key === 'Escape') setEditingTask(null)
                            e.stopPropagation()
                          }}
                          onClick={e => e.stopPropagation()}
                          style={{ flex: 1, background: 'var(--s2)', border: '1px solid var(--ac)', borderRadius: 4, color: 'var(--t1)', fontSize: 12, padding: '3px 8px', outline: 'none', fontFamily: 'inherit' }}
                        />
                      ) : (
                        <span
                          onClick={() => { setEditingTask({ si, ti }); setEditTitle(task.titulo) }}
                          title="Clique para editar título"
                          style={{ fontSize: 12, flex: 1, color: 'var(--t1)', cursor: 'text' }}
                          className="truncate"
                        >
                          {task.titulo}
                        </span>
                      )}

                      <TypeBadge tipo={task.tipo} size="xs" />
                      {task.checkItems?.length > 0 && (
                        <span style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--mono)', flexShrink: 0 }}>☑ {task.checkItems.length}</span>
                      )}
                      {task.due_date && (
                        <span style={{ fontSize: 10, color: 'var(--yellow)', fontFamily: 'var(--mono)', flexShrink: 0 }}>📅 {task.due_date}</span>
                      )}
                      {task.links?.length > 0 && (
                        <span style={{ fontSize: 10, color: 'var(--blue)', fontFamily: 'var(--mono)', flexShrink: 0 }}>🔗 {task.links.length}</span>
                      )}
                      {isHov && (
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            const next = sprints.map((s, i) =>
                              i !== si ? s : { ...s, tasks: s.tasks.filter((_, j) => j !== ti) }
                            )
                            onChange?.(next)
                          }}
                          title="Remover task"
                          style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 13, padding: '0 2px', flexShrink: 0, display: 'flex', alignItems: 'center' }}
                        >✕</button>
                      )}
                    </div>
                    {showAfter && <DropLine />}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function DropLine() {
  return <div style={{ height: 2, background: 'var(--ac)', borderRadius: 99, margin: '2px 0', boxShadow: '0 0 6px var(--ac)' }} />
}
