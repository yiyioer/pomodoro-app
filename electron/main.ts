import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, nativeTheme } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isAlwaysOnTop = false
let isQuitting = false

function createTrayIcon(text: string): nativeImage {
  const size = 16
  const canvas = Buffer.alloc(size * size * 4)
  for (let i = 0; i < size * size; i++) {
    canvas[i * 4] = 255
    canvas[i * 4 + 1] = 60
    canvas[i * 4 + 2] = 60
    canvas[i * 4 + 3] = 255
  }
  const img = nativeImage.createFromBuffer(canvas, { width: size, height: size })
  return img.resize({ width: 16, height: 16 })
}

function updateTrayTitle(text: string) {
  if (tray) {
    tray.setTitle(text)
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 600,
    minWidth: 400,
    minHeight: 610,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: false,
    skipTaskbar: false,
    title: '番茄钟',
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  if (process.platform === 'darwin') {
    mainWindow.setVisibleOnAllWorkspaces(true)
    mainWindow.setWindowButtonVisibility(false)
  }
}

function createTray() {
  const icon = createTrayIcon('')
  tray = new Tray(icon)
  tray.setToolTip('番茄钟')

  updateTray()

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
    }
  })
}

function updateTray() {
  if (!tray) return
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示/隐藏',
      click: () => {
        if (mainWindow) {
          mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
        }
      },
    },
    { type: 'separator' },
    {
      label: '窗口置顶',
      type: 'checkbox',
      checked: isAlwaysOnTop,
      click: (mi) => {
        isAlwaysOnTop = mi.checked
        if (mainWindow) mainWindow.setAlwaysOnTop(isAlwaysOnTop)
      },
    },
    {
      label: '深色模式',
      type: 'checkbox',
      checked: nativeTheme.shouldUseDarkColors,
      click: (mi) => {
        nativeTheme.themeSource = mi.checked ? 'dark' : 'light'
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit()
      },
    },
  ])
  tray.setContextMenu(contextMenu)
}

ipcMain.handle('toggle-always-on-top', (_event, enabled: boolean) => {
  isAlwaysOnTop = enabled
  if (mainWindow) mainWindow.setAlwaysOnTop(enabled)
  updateTray()
  return isAlwaysOnTop
})

ipcMain.handle('get-always-on-top', () => {
  return isAlwaysOnTop
})

ipcMain.handle('update-tray-timer', (_event, text: string) => {
  updateTrayTitle(text)
})

ipcMain.handle('minimize-window', () => {
  if (mainWindow) mainWindow.minimize()
})

ipcMain.handle('close-window', () => {
  if (mainWindow) mainWindow.hide()
})

ipcMain.handle('set-min-size', (_event, width: number, height: number) => {
  if (mainWindow) {
    mainWindow.setMinimumSize(width, height)
    const [w, h] = mainWindow.getSize()
    if (w < width || h < height) {
      mainWindow.setSize(Math.max(w, width), Math.max(h, height))
    }
  }
})

function animateResize(targetW: number, targetH: number) {
  if (!mainWindow) return
  const [startW, startH] = mainWindow.getSize()
  if (startW === targetW && startH === targetH) return
  const duration = 280
  const startTime = Date.now()

  const step = () => {
    const elapsed = Date.now() - startTime
    const t = Math.min(elapsed / duration, 1)
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
    const w = Math.round(startW + (targetW - startW) * eased)
    const h = Math.round(startH + (targetH - startH) * eased)
    mainWindow?.setSize(w, h)
    if (t < 1) setTimeout(step, 16)
  }
  step()
}

ipcMain.handle('shrink-window', () => {
  if (mainWindow) {
    animateResize(420, 520)
  }
})

ipcMain.handle('expand-window', () => {
  if (mainWindow) {
    const [w, h] = mainWindow.getSize()
    animateResize(Math.max(w, 420), Math.max(h, 620))
  }
})

ipcMain.handle('quit-app', () => {
  isQuitting = true
  app.quit()
})

app.whenReady().then(() => {
  createWindow()
  createTray()

  mainWindow?.on('close', (e) => {
    if (isQuitting) return
    e.preventDefault()
    mainWindow?.hide()
  })
})

app.on('window-all-closed', () => {
  // Don't quit on window close, stay in tray
})

app.on('before-quit', () => {
  tray?.destroy()
  tray = null
})
