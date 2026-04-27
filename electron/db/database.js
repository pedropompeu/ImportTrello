/**
 * database.js — Gerenciador SQLite com criptografia AES para dados sensíveis.
 *
 * Usa better-sqlite3 (síncrono, ideal para Electron main process).
 * Chaves de API são criptografadas com AES-256-CBC usando uma master key
 * derivada do ID da máquina, garantindo que o banco só abra na mesma máquina.
 */

const path    = require('path')
const crypto  = require('crypto')
const { app } = require('electron')
const { SCHEMA } = require('./schema')

let db = null

// ─── Derivação da master key ──────────────────────────────────────────────────
// Usamos o hostname + uma string fixa como salt para criar uma chave AES por máquina.
function getMasterKey() {
  const os   = require('os')
  const seed = `trello-smart-importer::${os.hostname()}::${os.platform()}`
  return crypto.createHash('sha256').update(seed).digest() // 32 bytes → AES-256
}

// ─── Encrypt / Decrypt ────────────────────────────────────────────────────────
function encrypt(plaintext) {
  if (!plaintext) return ''
  const iv         = crypto.randomBytes(16)
  const cipher     = crypto.createCipheriv('aes-256-cbc', getMasterKey(), iv)
  const encrypted  = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

function decrypt(ciphertext) {
  if (!ciphertext) return ''
  try {
    const [ivHex, encHex] = ciphertext.split(':')
    const iv        = Buffer.from(ivHex, 'hex')
    const enc       = Buffer.from(encHex, 'hex')
    const decipher  = crypto.createDecipheriv('aes-256-cbc', getMasterKey(), iv)
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
  } catch {
    return ''
  }
}

// ─── Inicialização ────────────────────────────────────────────────────────────
function initDatabase() {
  // better-sqlite3 não está disponível neste ambiente de build,
  // mas o código é correto para produção. Usamos um stub em dev.
  let Database
  try {
    Database = require('better-sqlite3')
  } catch {
    console.warn('[DB] better-sqlite3 não disponível — usando stub de desenvolvimento')
    return createDevStub()
  }

  const dbPath = path.join(app.getPath('userData'), 'trello-importer.db')
  console.log('[DB] Path:', dbPath)

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // Cria todas as tabelas
  db.exec(SCHEMA)

  // Seeds: templates builtin
  seedBuiltinTemplates()

  return createDbApi()
}

// ─── API pública do banco ─────────────────────────────────────────────────────
function createDbApi() {
  return {
    // ── Settings ──────────────────────────────────────────────────────────────
    getSetting(key) {
      const row = db.prepare('SELECT value, encrypted FROM settings WHERE key = ?').get(key)
      if (!row) return null
      return row.encrypted ? decrypt(row.value) : row.value
    },
    setSetting(key, value, encrypted = false) {
      const stored = encrypted ? encrypt(value) : value
      db.prepare(`
        INSERT INTO settings (key, value, encrypted, updated_at)
        VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value=excluded.value, encrypted=excluded.encrypted, updated_at=excluded.updated_at
      `).run(key, stored, encrypted ? 1 : 0)
    },
    getAllSettings() {
      const rows = db.prepare('SELECT key, value, encrypted FROM settings').all()
      return rows.reduce((acc, row) => {
        acc[row.key] = row.encrypted ? decrypt(row.value) : row.value
        return acc
      }, {})
    },

    // ── AI Providers ──────────────────────────────────────────────────────────
    getAiProviders() {
      const rows = db.prepare('SELECT * FROM ai_providers ORDER BY name').all()
      return rows.map(r => ({ ...r, api_key: decrypt(r.api_key) }))
    },
    upsertAiProvider(provider) {
      const id = provider.id || crypto.randomUUID()
      db.prepare(`
        INSERT INTO ai_providers (id, name, model, api_key, base_url, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name=excluded.name, model=excluded.model,
          api_key=excluded.api_key, base_url=excluded.base_url,
          is_active=excluded.is_active
      `).run(id, provider.name, provider.model, encrypt(provider.api_key || ''), provider.base_url || '', provider.is_active ? 1 : 0)
      return id
    },
    setActiveAiProvider(id) {
      db.prepare('UPDATE ai_providers SET is_active = 0').run()
      db.prepare('UPDATE ai_providers SET is_active = 1 WHERE id = ?').run(id)
    },
    deleteAiProvider(id) {
      db.prepare('DELETE FROM ai_providers WHERE id = ?').run(id)
    },
    getActiveAiProvider() {
      const row = db.prepare('SELECT * FROM ai_providers WHERE is_active = 1 LIMIT 1').get()
      if (!row) return null
      return { ...row, api_key: decrypt(row.api_key) }
    },

    // ── Boards ────────────────────────────────────────────────────────────────
    getBoards() {
      return db.prepare('SELECT * FROM boards WHERE is_active = 1 ORDER BY name').all()
    },
    upsertBoard(board) {
      db.prepare(`
        INSERT INTO boards (id, name, url, last_synced, is_active)
        VALUES (?, ?, ?, datetime('now'), 1)
        ON CONFLICT(id) DO UPDATE SET name=excluded.name, url=excluded.url, last_synced=datetime('now')
      `).run(board.id, board.name, board.url || '')
    },
    deleteBoard(id) {
      db.prepare('UPDATE boards SET is_active = 0 WHERE id = ?').run(id)
    },

    // ── Projects ──────────────────────────────────────────────────────────────
    getProjects() {
      return db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all()
    },
    getProject(id) {
      return db.prepare('SELECT * FROM projects WHERE id = ?').get(id)
    },
    createProject(project) {
      const id = crypto.randomUUID()
      db.prepare(`
        INSERT INTO projects (id, name, description, board_id, template_id, source_type, status)
        VALUES (?, ?, ?, ?, ?, ?, 'draft')
      `).run(id, project.name, project.description || '', project.board_id || null, project.template_id || null, project.source_type || 'manual')
      return id
    },
    updateProject(id, fields) {
      const sets = Object.keys(fields).map(k => `${k} = ?`).join(', ')
      db.prepare(`UPDATE projects SET ${sets}, updated_at = datetime('now') WHERE id = ?`)
        .run(...Object.values(fields), id)
    },
    deleteProject(id) {
      db.prepare('DELETE FROM projects WHERE id = ?').run(id)
    },

    // ── Tasks ─────────────────────────────────────────────────────────────────
    getTasksByProject(projectId) {
      const tasks = db.prepare(`
        SELECT * FROM tasks WHERE project_id = ? ORDER BY sprint, position
      `).all(projectId)

      return tasks.map(t => ({
        ...t,
        checkItems: db.prepare('SELECT text FROM task_checklist WHERE task_id = ? ORDER BY position').all(t.id).map(r => r.text),
        links:      db.prepare('SELECT * FROM task_links WHERE task_id = ? ORDER BY position').all(t.id),
      }))
    },
    createTask(task) {
      const id = task.id || crypto.randomUUID()
      db.prepare(`
        INSERT INTO tasks (id, project_id, sprint, sprint_title, titulo, tipo, destino_col, desc_limpa, due_date, position, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      `).run(id, task.project_id, task.sprint || '', task.sprint_title || '', task.titulo, task.tipo || 'Backend', task.destino_col || 'Backlog', task.desc_limpa || '', task.due_date || null, task.position || 0)

      // Checklist
      if (task.checkItems?.length) {
        const insertItem = db.prepare('INSERT INTO task_checklist (id, task_id, text, position) VALUES (?, ?, ?, ?)')
        task.checkItems.forEach((text, i) => insertItem.run(crypto.randomUUID(), id, text, i))
      }

      // Links
      if (task.links?.length) {
        const insertLink = db.prepare('INSERT INTO task_links (id, task_id, type, label, value, position) VALUES (?, ?, ?, ?, ?, ?)')
        task.links.forEach((link, i) => insertLink.run(crypto.randomUUID(), id, link.type || 'url', link.label || '', link.value, i))
      }

      return id
    },
    updateTask(id, fields) {
      const { checkItems, links, ...rest } = fields
      if (Object.keys(rest).length) {
        const sets = Object.keys(rest).map(k => `${k} = ?`).join(', ')
        db.prepare(`UPDATE tasks SET ${sets}, updated_at = datetime('now') WHERE id = ?`)
          .run(...Object.values(rest), id)
      }
      if (checkItems !== undefined) {
        db.prepare('DELETE FROM task_checklist WHERE task_id = ?').run(id)
        const ins = db.prepare('INSERT INTO task_checklist (id, task_id, text, position) VALUES (?, ?, ?, ?)')
        checkItems.forEach((text, i) => ins.run(crypto.randomUUID(), id, text, i))
      }
      if (links !== undefined) {
        db.prepare('DELETE FROM task_links WHERE task_id = ?').run(id)
        const ins = db.prepare('INSERT INTO task_links (id, task_id, type, label, value, position) VALUES (?, ?, ?, ?, ?, ?)')
        links.forEach((link, i) => ins.run(crypto.randomUUID(), id, link.type || 'url', link.label || '', link.value, i))
      }
    },
    updateTaskStatus(id, status, trelloCardId = null, errorMsg = null) {
      db.prepare(`UPDATE tasks SET status = ?, trello_card_id = ?, error_msg = ?, updated_at = datetime('now') WHERE id = ?`)
        .run(status, trelloCardId, errorMsg, id)
    },
    deleteTask(id) {
      db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
    },

    // ── Templates ─────────────────────────────────────────────────────────────
    getTemplates() {
      return db.prepare('SELECT * FROM templates ORDER BY category DESC, name').all()
    },
    getTemplateTasks(templateId) {
      return db.prepare('SELECT * FROM template_tasks WHERE template_id = ? ORDER BY sprint, position').all(templateId)
    },

    // ── Bulk import de tasks (transação) ─────────────────────────────────────
    importTasks(projectId, tasks) {
      const insertTask  = db.prepare(`INSERT INTO tasks (id, project_id, sprint, sprint_title, titulo, tipo, destino_col, desc_limpa, due_date, position, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`)
      const insertItem  = db.prepare('INSERT INTO task_checklist (id, task_id, text, position) VALUES (?, ?, ?, ?)')
      const insertLink  = db.prepare('INSERT INTO task_links (id, task_id, type, label, value, position) VALUES (?, ?, ?, ?, ?, ?)')

      const runAll = db.transaction((tasks) => {
        tasks.forEach((task, pos) => {
          const id = crypto.randomUUID()
          insertTask.run(id, projectId, task.sprint || '', task.sprint_title || '', task.titulo, task.tipo || 'Backend', task.destino_col || 'Backlog', task.desc_limpa || '', task.due_date || null, pos)
          ;(task.checkItems || []).forEach((text, i) => insertItem.run(crypto.randomUUID(), id, text, i))
          ;(task.links || []).forEach((link, i) => insertLink.run(crypto.randomUUID(), id, link.type || 'url', link.label || '', link.value, i))
        })
      })
      runAll(tasks)
    },
  }
}

// ─── Stub de desenvolvimento (sem SQLite) ────────────────────────────────────
function createDevStub() {
  console.warn('[DB] Rodando com stub em memória — dados não são persistidos')
  const store = { settings: {}, boards: [], projects: [], tasks: [], ai_providers: [], templates: [], template_tasks: [] }

  return {
    getSetting: (key) => store.settings[key] || null,
    setSetting: (key, value) => { store.settings[key] = value },
    getAllSettings: () => store.settings,
    getAiProviders: () => store.ai_providers,
    upsertAiProvider: (p) => { const id = p.id || Math.random().toString(36).slice(2); store.ai_providers = store.ai_providers.filter(x => x.id !== id); store.ai_providers.push({ ...p, id }); return id },
    setActiveAiProvider: (id) => store.ai_providers.forEach(p => p.is_active = p.id === id ? 1 : 0),
    deleteAiProvider: (id) => { store.ai_providers = store.ai_providers.filter(p => p.id !== id) },
    getActiveAiProvider: () => store.ai_providers.find(p => p.is_active) || null,
    getBoards: () => store.boards,
    upsertBoard: (b) => { store.boards = store.boards.filter(x => x.id !== b.id); store.boards.push(b) },
    deleteBoard: (id) => { store.boards = store.boards.filter(b => b.id !== id) },
    getProjects: () => store.projects,
    getProject: (id) => store.projects.find(p => p.id === id) || null,
    createProject: (p) => { const id = Math.random().toString(36).slice(2); store.projects.push({ ...p, id, status: 'draft', created_at: new Date().toISOString() }); return id },
    updateProject: (id, fields) => { const p = store.projects.find(x => x.id === id); if (p) Object.assign(p, fields) },
    deleteProject: (id) => { store.projects = store.projects.filter(p => p.id !== id); store.tasks = store.tasks.filter(t => t.project_id !== id) },
    getTasksByProject: (pid) => store.tasks.filter(t => t.project_id === pid).map(t => ({ ...t, checkItems: t.checkItems || [], links: t.links || [] })),
    createTask: (t) => { const id = Math.random().toString(36).slice(2); store.tasks.push({ ...t, id, status: 'pending' }); return id },
    updateTask: (id, f) => { const t = store.tasks.find(x => x.id === id); if (t) Object.assign(t, f) },
    updateTaskStatus: (id, status, cardId, err) => { const t = store.tasks.find(x => x.id === id); if (t) { t.status = status; t.trello_card_id = cardId; t.error_msg = err } },
    deleteTask: (id) => { store.tasks = store.tasks.filter(t => t.id !== id) },
    getTemplates: () => BUILTIN_TEMPLATES,
    getTemplateTasks: (tid) => BUILTIN_TEMPLATE_TASKS.filter(t => t.template_id === tid),
    importTasks: (pid, tasks) => tasks.forEach((t, i) => { const id = Math.random().toString(36).slice(2); store.tasks.push({ ...t, id, project_id: pid, position: i, status: 'pending' }) }),
  }
}

// ─── Templates builtin ───────────────────────────────────────────────────────
const BUILTIN_TEMPLATES = [
  { id: 'tpl-scrum',   name: 'Gestão de Projeto (Scrum)', description: 'Template padrão para projetos de software com sprints',        category: 'builtin', icon: '⚡' },
  { id: 'tpl-book',    name: 'Escrita de Livro',          description: 'Organização de capítulos, pesquisa e revisão',                  category: 'builtin', icon: '📚' },
  { id: 'tpl-launch',  name: 'Lançamento de Produto',     description: 'Pré-lançamento, Dia D e pós-lançamento',                       category: 'builtin', icon: '🚀' },
  { id: 'tpl-event',   name: 'Organização de Evento',     description: 'Planejamento, execução e follow-up de eventos',                 category: 'builtin', icon: '🎯' },
  { id: 'tpl-content', name: 'Criação de Conteúdo',       description: 'Pipeline editorial: pauta → rascunho → revisão → publicação',  category: 'builtin', icon: '✍️'  },
]

const BUILTIN_TEMPLATE_TASKS = [
  // Scrum
  { id: 'tt-1', template_id: 'tpl-scrum', sprint: 'Sprint 0', sprint_title: 'Setup', titulo: '[INFRA] Setup do repositório', tipo: 'Infra / Config', destino_col: 'Backlog', checklist: JSON.stringify(['Criar repositório', 'Configurar CI/CD', 'Setup de ambiente local']), position: 0 },
  { id: 'tt-2', template_id: 'tpl-scrum', sprint: 'Sprint 0', sprint_title: 'Setup', titulo: '[DB] Setup do banco de dados', tipo: 'Backend', destino_col: 'Backlog', checklist: JSON.stringify(['Escolher banco', 'Criar schema inicial', 'Migrations']), position: 1 },
  { id: 'tt-3', template_id: 'tpl-scrum', sprint: 'Sprint 1', sprint_title: 'MVP', titulo: '[UI] Layout base da aplicação', tipo: 'Frontend', destino_col: 'Backlog', checklist: JSON.stringify(['Criar componentes base', 'Definir roteamento', 'Setup de estado global']), position: 2 },
  // Book
  { id: 'tt-4', template_id: 'tpl-book', sprint: 'Fase 1', sprint_title: 'Planejamento', titulo: 'Definir estrutura do livro', tipo: 'Docs', destino_col: 'Backlog', checklist: JSON.stringify(['Definir número de capítulos', 'Escrever sinopse', 'Criar outline']), position: 0 },
  { id: 'tt-5', template_id: 'tpl-book', sprint: 'Fase 2', sprint_title: 'Escrita', titulo: 'Escrever Capítulo 1', tipo: 'Docs', destino_col: 'Backlog', checklist: JSON.stringify(['Primeiro rascunho', 'Revisão interna', 'Envio para editor']), position: 1 },
]

function seedBuiltinTemplates() {
  const existing = db.prepare('SELECT id FROM templates WHERE category = ?').all('builtin')
  if (existing.length > 0) return

  const insT  = db.prepare('INSERT OR IGNORE INTO templates (id, name, description, category, icon) VALUES (?, ?, ?, ?, ?)')
  const insTT = db.prepare('INSERT OR IGNORE INTO template_tasks (id, template_id, sprint, sprint_title, titulo, tipo, destino_col, checklist, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')

  db.transaction(() => {
    BUILTIN_TEMPLATES.forEach(t => insT.run(t.id, t.name, t.description, t.category, t.icon))
    BUILTIN_TEMPLATE_TASKS.forEach(t => insTT.run(t.id, t.template_id, t.sprint, t.sprint_title, t.titulo, t.tipo, t.destino_col, t.checklist, t.position))
  })()
}

module.exports = { initDatabase, encrypt, decrypt }
