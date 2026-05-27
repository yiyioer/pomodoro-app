/// <reference types="vite/client" />

interface ElectronAPI {
  toggleAlwaysOnTop: (enabled: boolean) => Promise<boolean>
  getAlwaysOnTop: () => Promise<boolean>
  updateTrayTimer: (text: string) => Promise<void>
  minimizeWindow: () => Promise<void>
  closeWindow: () => Promise<void>
  setMinSize: (width: number, height: number) => Promise<void>
  quitApp: () => Promise<void>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
