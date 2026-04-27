const { app, BrowserWindow } = require('electron')
const path = require('path')
const { initDatabase } = require('./db/database')
const { registerHandlers } = require('./ipc/ipcHandlers')

const isDev = process.env.NODE_ENV !== 'production'

let mainWindow

function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.js')
  console.log('[Main] Preload path:', preloadPath)

  mainWindow = new BrowserWindow({
    width:  1340,
    height: 900,
    minWidth:  1100,
    minHeight: 720,
    backgroundColor: '#0a0a0c',
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

app.whenReady().then(() => {
  const db = initDatabase()
  registerHandlers(db)
  createWindow()
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
