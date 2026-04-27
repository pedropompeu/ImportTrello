const { app, BrowserWindow, protocol } = require('electron')
const path = require('path')
const { initDatabase } = require('./db/database')
const { registerHandlers } = require('./ipc/ipcHandlers')

// Usa app.isPackaged — mais confiável que NODE_ENV para builds de produção
const isDev = !app.isPackaged

let mainWindow

function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.js')

  mainWindow = new BrowserWindow({
    width:     1340,
    height:    900,
    minWidth:  1100,
    minHeight: 720,
    backgroundColor: '#111318',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 18 },
    webPreferences: {
      preload:          preloadPath,
      contextIsolation: true,
      nodeIntegration:  false,
      sandbox:          false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    // mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

// Necessário no macOS para lidar com abertura por arquivos / URLs
app.on('open-file', (event) => {
  event.preventDefault()
})

app.on('open-url', (event) => {
  event.preventDefault()
})

app.whenReady().then(() => {
  const db = initDatabase()
  registerHandlers(db)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
