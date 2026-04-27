const { contextBridge, ipcRenderer } = require('electron')

// Helper para criar invoke wrappers limpos
const invoke = (channel) => (...args) => ipcRenderer.invoke(channel, ...args)

contextBridge.exposeInMainWorld('api', {
  // Settings
  settings: {
    getAll:          invoke('settings:get-all'),
    set:             invoke('settings:set'),
    validateTrello:  invoke('settings:trello-validate'),
  },

  // AI
  ai: {
    getProviders:   invoke('ai:get-providers'),
    upsertProvider: invoke('ai:upsert-provider'),
    setActive:      invoke('ai:set-active'),
    deleteProvider: invoke('ai:delete-provider'),
    validateKey:    invoke('ai:validate-key'),
    generateTasks:  invoke('ai:generate-tasks'),
  },

  // Boards
  boards: {
    fetchFromTrello: invoke('boards:fetch-from-trello'),
    getLocal:        invoke('boards:get-local'),
    delete:          invoke('boards:delete'),
  },

  // Projects
  projects: {
    list:         invoke('projects:list'),
    get:          invoke('projects:get'),
    create:       invoke('projects:create'),
    update:       invoke('projects:update'),
    delete:       invoke('projects:delete'),
    fromTemplate: invoke('projects:from-template'),
  },

  // Tasks
  tasks: {
    update: invoke('tasks:update'),
    delete: invoke('tasks:delete'),
    create: invoke('tasks:create'),
  },

  // Parse
  parse: {
    openFileDialog:  invoke('parse:open-file-dialog'),
    importToProject: invoke('parse:import-to-project'),
    getTemplate:     invoke('parse:get-template'),
  },

  // Templates
  templates: {
    list:     invoke('templates:list'),
    getTasks: invoke('templates:get-tasks'),
  },

  // Import
  import: {
    start: invoke('import:start'),
    onProgress: (cb) => {
      ipcRenderer.on('import:progress', (_, data) => cb(data))
      return () => ipcRenderer.removeAllListeners('import:progress')
    },
  },

  // App utils
  app: {
    saveFile: invoke('app:save-file'),
  },
})
