import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  toggleAlwaysOnTop: (enabled: boolean) => ipcRenderer.invoke('toggle-always-on-top', enabled),
  getAlwaysOnTop: () => ipcRenderer.invoke('get-always-on-top'),
  updateTrayTimer: (text: string) => ipcRenderer.invoke('update-tray-timer', text),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  setMinSize: (width: number, height: number) => ipcRenderer.invoke('set-min-size', width, height),
  shrinkWindow: () => ipcRenderer.invoke('shrink-window'),
  expandWindow: () => ipcRenderer.invoke('expand-window'),
  quitApp: () => ipcRenderer.invoke('quit-app'),
})
