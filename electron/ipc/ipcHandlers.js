/**
 * ipcHandlers.js — Todos os handlers IPC em um lugar só.
 *
 * Organização por domínio:
 *   settings:*   — credenciais e configurações
 *   boards:*     — gerenciamento de boards
 *   projects:*   — projetos locais
 *   tasks:*      — tasks de um projeto
 *   ai:*         — geração via IA
 *   parse:*      — importação de arquivos
 *   import:*     — envio para o Trello
 *   templates:*  — templates
 */

const { ipcMain, dialog } = require('electron')
const fs = require('fs')
const { generateTasksFromText, validateAiKey } = require('../services/aiService')
const { parseContent, generateCSVTemplate, generateJSONTemplate } = require('../services/parserService')
const { getBoards, validateCredentials, importTasks } = require('../services/trelloService')

function registerHandlers(db) {

  // ─── Settings ──────────────────────────────────────────────────────────────
  ipcMain.handle('settings:get-all', () => {
    return db.getAllSettings()
  })

  ipcMain.handle('settings:set', (_, { key, value, encrypted }) => {
    db.setSetting(key, value, encrypted)
    return { ok: true }
  })

  ipcMain.handle('settings:trello-validate', async (_, { apiKey, token, boardId }) => {
    return validateCredentials(apiKey, token, boardId)
  })

  // ─── AI Providers ──────────────────────────────────────────────────────────
  ipcMain.handle('ai:get-providers', () => {
    return db.getAiProviders()
  })

  ipcMain.handle('ai:upsert-provider', (_, provider) => {
    const id = db.upsertAiProvider(provider)
    return { ok: true, id }
  })

  ipcMain.handle('ai:set-active', (_, { id }) => {
    db.setActiveAiProvider(id)
    return { ok: true }
  })

  ipcMain.handle('ai:delete-provider', (_, { id }) => {
    db.deleteAiProvider(id)
    return { ok: true }
  })

  ipcMain.handle('ai:validate-key', async (_, { provider }) => {
    return validateAiKey({ provider })
  })

  ipcMain.handle('ai:generate-tasks', async (event, { text }) => {
    const provider = db.getActiveAiProvider()
    if (!provider) return { ok: false, error: 'Nenhum provider de IA configurado. Vá em Configurações → IA.' }

    try {
      const result = await generateTasksFromText({ text, provider })
      return { ok: true, result }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  })

  // ─── Boards ────────────────────────────────────────────────────────────────
  ipcMain.handle('boards:fetch-from-trello', async () => {
    const settings = db.getAllSettings()
    if (!settings.trello_api_key || !settings.trello_token) {
      return { ok: false, error: 'Credenciais do Trello não configuradas.' }
    }
    try {
      const boards = await getBoards(settings.trello_api_key, settings.trello_token)
      boards.forEach(b => db.upsertBoard({ id: b.id, name: b.name, url: b.url }))
      return { ok: true, boards }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  })

  ipcMain.handle('boards:get-local', () => {
    return db.getBoards()
  })

  ipcMain.handle('boards:delete', (_, { id }) => {
    db.deleteBoard(id)
    return { ok: true }
  })

  // ─── Projects ──────────────────────────────────────────────────────────────
  ipcMain.handle('projects:list', () => {
    return db.getProjects()
  })

  ipcMain.handle('projects:get', (_, { id }) => {
    const project = db.getProject(id)
    const tasks   = db.getTasksByProject(id)
    return { project, tasks }
  })

  ipcMain.handle('projects:create', (_, project) => {
    const id = db.createProject(project)
    return { ok: true, id }
  })

  ipcMain.handle('projects:update', (_, { id, ...fields }) => {
    db.updateProject(id, fields)
    return { ok: true }
  })

  ipcMain.handle('projects:delete', (_, { id }) => {
    db.deleteProject(id)
    return { ok: true }
  })

  // Criar projeto a partir de um template
  ipcMain.handle('projects:from-template', (_, { name, boardId, templateId }) => {
    const projectId = db.createProject({ name, board_id: boardId, template_id: templateId, source_type: 'template' })
    const tplTasks  = db.getTemplateTasks(templateId)

    const tasks = tplTasks.map((t, i) => ({
      project_id:   projectId,
      sprint:       t.sprint,
      sprint_title: t.sprint_title,
      titulo:       t.titulo,
      tipo:         t.tipo,
      destino_col:  t.destino_col,
      desc_limpa:   t.desc_template || '',
      checkItems:   JSON.parse(t.checklist || '[]'),
      position:     i,
    }))

    db.importTasks(projectId, tasks)
    return { ok: true, projectId, taskCount: tasks.length }
  })

  // ─── Tasks ─────────────────────────────────────────────────────────────────
  ipcMain.handle('tasks:update', (_, { id, ...fields }) => {
    db.updateTask(id, fields)
    return { ok: true }
  })

  ipcMain.handle('tasks:delete', (_, { id }) => {
    db.deleteTask(id)
    return { ok: true }
  })

  ipcMain.handle('tasks:create', (_, task) => {
    const id = db.createTask(task)
    return { ok: true, id }
  })

  // ─── Parse de arquivos ─────────────────────────────────────────────────────
  ipcMain.handle('parse:open-file-dialog', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters:    [
        { name: 'Arquivos suportados', extensions: ['json', 'csv', 'xlsx', 'xls'] },
        { name: 'JSON',  extensions: ['json'] },
        { name: 'CSV',   extensions: ['csv'] },
        { name: 'Excel', extensions: ['xlsx', 'xls'] },
      ],
    })
    if (result.canceled || !result.filePaths.length) return { canceled: true }

    const filePath = result.filePaths[0]
    const ext      = require('path').extname(filePath).toLowerCase()

    try {
      const buffer  = fs.readFileSync(filePath)
      const content = buffer.toString('utf-8')
      const parsed  = parseContent(ext, content, buffer)
      return { ok: true, parsed, fileName: require('path').basename(filePath) }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  })

  ipcMain.handle('parse:import-to-project', (_, { projectId, parsed }) => {
    const tasks = parsed.sprints.flatMap(s =>
      s.tasks.map((t, i) => ({
        ...t,
        project_id:   projectId,
        sprint:       t.sprint || s.label,
        sprint_title: t.sprint_title || s.titulo,
        position:     i,
      }))
    )
    db.importTasks(projectId, tasks)
    return { ok: true, taskCount: tasks.length }
  })

  ipcMain.handle('parse:get-template', (_, { format }) => {
    if (format === 'csv')  return { ok: true, content: generateCSVTemplate(),  ext: '.csv'  }
    if (format === 'json') return { ok: true, content: generateJSONTemplate(), ext: '.json' }
    return { ok: false, error: 'Formato inválido' }
  })

  // ─── Templates ─────────────────────────────────────────────────────────────
  ipcMain.handle('templates:list', () => {
    return db.getTemplates()
  })

  ipcMain.handle('templates:get-tasks', (_, { templateId }) => {
    return db.getTemplateTasks(templateId)
  })

  // ─── Importação para o Trello ──────────────────────────────────────────────
  ipcMain.handle('import:start', async (event, { projectId, taskIds }) => {
    const settings = db.getAllSettings()

    if (!settings.trello_api_key || !settings.trello_token) {
      return { ok: false, error: 'Credenciais do Trello não configuradas.' }
    }

    const project  = db.getProject(projectId)
    if (!project?.board_id) return { ok: false, error: 'Projeto não tem board vinculado.' }

    const allTasks = db.getTasksByProject(projectId)
    const toImport = taskIds
      ? allTasks.filter(t => taskIds.includes(t.id) && t.status === 'pending')
      : allTasks.filter(t => t.status === 'pending')

    if (!toImport.length) return { ok: false, error: 'Nenhuma task pendente para importar.' }

    // Marca como "importing"
    toImport.forEach(t => db.updateTaskStatus(t.id, 'importing'))

    const sprintLabels = [...new Set(toImport.map(t => t.sprint).filter(Boolean))]

    const results = await importTasks({
      tasks:        toImport,
      boardId:      project.board_id,
      apiKey:       settings.trello_api_key,
      token:        settings.trello_token,
      delayMs:      parseInt(settings.import_delay_ms || '300', 10),
      sprintLabels,
      onProgress: (msg) => {
        event.sender.send('import:progress', msg)
        // Atualiza status no banco conforme progresso
        if (msg.type === 'card_done')  db.updateTaskStatus(msg.taskId, 'done', msg.cardId)
        if (msg.type === 'card_error') db.updateTaskStatus(msg.taskId, 'error', null, msg.error)
      },
    })

    // Atualiza status do projeto
    const allDone = db.getTasksByProject(projectId).every(t => t.status === 'done')
    if (allDone) db.updateProject(projectId, { status: 'done' })

    return { ok: true, results }
  })

  // Abre dialog para salvar arquivo (templates)
  ipcMain.handle('app:save-file', async (_, { content, defaultName, ext }) => {
    const result = await dialog.showSaveDialog({
      defaultPath: defaultName,
      filters: [{ name: ext.toUpperCase(), extensions: [ext.replace('.', '')] }],
    })
    if (result.canceled) return { canceled: true }
    fs.writeFileSync(result.filePath, content, 'utf-8')
    return { ok: true, filePath: result.filePath }
  })
}

module.exports = { registerHandlers }
