/**
 * trelloService.js — Wrapper completo da API do Trello.
 *
 * Inclui:
 * - Retry automático em rate limit (HTTP 429)
 * - Queue sequencial com delay configurável
 * - Suporte a checklists, due dates, labels e attachments (URLs)
 */

const https = require('https')

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// ─── HTTP ─────────────────────────────────────────────────────────────────────
function trelloRequest(method, path, body, apiKey, token) {
  return new Promise((resolve, reject) => {
    const cleanKey   = (apiKey || '').trim()
    const cleanToken = (token  || '').trim()
    
    const url = new URL(`https://api.trello.com/1${path}`)
    url.searchParams.set('key',   cleanKey)
    url.searchParams.set('token', cleanToken)

    const payload = body ? JSON.stringify(body) : null
    const req = https.request({
      hostname: url.hostname,
      path:     url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    }, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        if (res.statusCode === 429) {
          const wait = parseInt(res.headers['retry-after'] || '10', 10) * 1000
          reject({ isRateLimit: true, wait })
        } else if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(data)) } catch { resolve(data) }
        } else {
          reject(new Error(`Trello API ${res.statusCode}: ${data.slice(0, 300)}`))
        }
      })
    })
    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })
}

async function apiCall(method, path, body, apiKey, token, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await trelloRequest(method, path, body, apiKey, token)
    } catch (err) {
      if (err.isRateLimit && i < retries - 1) {
        console.log(`[Trello] Rate limit — aguardando ${err.wait}ms`)
        await sleep(err.wait)
        continue
      }
      throw err
    }
  }
}

// ─── Board operations ─────────────────────────────────────────────────────────
async function getBoards(apiKey, token) {
  return apiCall('GET', '/members/me/boards?filter=open&fields=id,name,url', null, apiKey, token)
}

async function getBoardLists(boardId, apiKey, token) {
  return apiCall('GET', `/boards/${boardId}/lists?filter=open`, null, apiKey, token)
}

async function getBoardLabels(boardId, apiKey, token) {
  return apiCall('GET', `/boards/${boardId}/labels`, null, apiKey, token)
}

async function validateCredentials(apiKey, token, boardId) {
  try {
    // Se não houver boardId ou for 'x', valida apenas o token pegando os dados do usuário
    const path = (!boardId || boardId === 'x') ? '/members/me?fields=username,fullName' : `/boards/${boardId}?fields=name,url`
    const res = await apiCall('GET', path, null, apiKey, token)
    
    if (!boardId || boardId === 'x') {
      return { ok: true, username: res.username, fullName: res.fullName }
    }
    return { ok: true, boardName: res.name, boardUrl: res.url }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

// ─── Setup do board (listas e labels) ────────────────────────────────────────
async function ensureBoardSetup(boardId, apiKey, token) {
  const COLUNAS = ['Backlog', 'A Fazer', 'Em Progresso', 'Em Revisão', 'Em Espera', 'Concluído']
  const LABEL_CORES = {
    'Backend':        'green',
    'Frontend':       'blue',
    'Infra / Config': 'sky',
    'Testes':         'orange_dark',
    'Docs':           'yellow_dark',
    'Mobile':         'purple',
    'DevOps':         'pink',
  }

  // Listas
  const existingLists = await getBoardLists(boardId, apiKey, token)
  const listMap = {}
  existingLists.forEach(l => { listMap[l.name] = l.id })

  for (const col of COLUNAS) {
    if (!listMap[col]) {
      await sleep(200)
      const created = await apiCall('POST', `/boards/${boardId}/lists`, { name: col, pos: 'bottom' }, apiKey, token)
      listMap[col] = created.id
    }
  }

  // Labels tipo
  const existingLabels = await getBoardLabels(boardId, apiKey, token)
  const labelMap = {}
  existingLabels.forEach(l => { if (l.name) labelMap[l.name] = l.id })

  for (const [name, color] of Object.entries(LABEL_CORES)) {
    if (!labelMap[name]) {
      await sleep(200)
      const created = await apiCall('POST', `/boards/${boardId}/labels`, { name, color, idBoard: boardId }, apiKey, token)
      labelMap[name] = created.id
    }
  }

  return { listMap, labelMap }
}

// ─── Motor de importação sequencial ──────────────────────────────────────────
/**
 * importTasks — importa tasks sequencialmente com:
 * - delay configurável entre cards
 * - criação de checklists nativos
 * - adição de due dates
 * - adição de links como attachments
 * - callback onProgress para atualização em tempo real
 */
async function importTasks({ tasks, boardId, apiKey, token, delayMs = 300, onProgress, sprintLabels }) {
  const { listMap, labelMap } = await ensureBoardSetup(boardId, apiKey, token)

  // Garante labels de sprint
  for (const sprintLabel of (sprintLabels || [])) {
    if (!labelMap[sprintLabel]) {
      const SPRINT_COLORS = ['red','orange','yellow','lime','green','sky','blue','purple','pink','black','red_dark','orange_dark','yellow_dark','lime_dark']
      const idx   = parseInt(sprintLabel.replace(/\D/g, '') || '0', 10)
      const color = SPRINT_COLORS[idx % SPRINT_COLORS.length]
      await sleep(150)
      const created = await apiCall('POST', `/boards/${boardId}/labels`, { name: sprintLabel, color, idBoard: boardId }, apiKey, token)
      labelMap[sprintLabel] = created.id
    }
  }

  const results = []

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i]
    onProgress?.({ type: 'card_start', index: i, total: tasks.length, titulo: task.titulo, taskId: task.id })

    try {
      // Montar idLabels
      const idLabels = []
      if (labelMap[task.tipo])   idLabels.push(labelMap[task.tipo])
      if (task.sprint && labelMap[task.sprint]) idLabels.push(labelMap[task.sprint])

      // Criar card
      const cardBody = {
        name:     task.titulo,
        desc:     task.desc_limpa || '',
        idList:   listMap[task.destino_col] || listMap['Backlog'],
        idLabels: idLabels.join(','),
        pos:      'bottom',
      }
      if (task.due_date) cardBody.due = task.due_date

      const card = await apiCall('POST', '/cards', cardBody, apiKey, token)
      await sleep(delayMs)

      // Checklist
      if (task.checkItems?.length) {
        onProgress?.({ type: 'checklist', titulo: task.titulo, count: task.checkItems.length })
        const checklist = await apiCall('POST', `/cards/${card.id}/checklists`, { name: 'Checklist' }, apiKey, token)
        for (const item of task.checkItems) {
          await apiCall('POST', `/checklists/${checklist.id}/checkItems`, { name: item }, apiKey, token)
          await sleep(120)
        }
        await sleep(delayMs)
      }

      // Links / attachments (URLs)
      if (task.links?.length) {
        for (const link of task.links.filter(l => l.type === 'url' && l.value)) {
          onProgress?.({ type: 'attachment', titulo: task.titulo, label: link.label || link.value })
          await apiCall('POST', `/cards/${card.id}/attachments`, { url: link.value, name: link.label || link.value }, apiKey, token)
          await sleep(150)
        }
      }

      onProgress?.({ type: 'card_done', taskId: task.id, cardId: card.id, titulo: task.titulo })
      results.push({ taskId: task.id, cardId: card.id, ok: true })

    } catch (err) {
      onProgress?.({ type: 'card_error', taskId: task.id, titulo: task.titulo, error: err.message })
      results.push({ taskId: task.id, ok: false, error: err.message })
    }

    await sleep(delayMs)
  }

  onProgress?.({ type: 'finished', total: tasks.length, success: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).length })
  return results
}

module.exports = { getBoards, getBoardLists, validateCredentials, importTasks, ensureBoardSetup }
