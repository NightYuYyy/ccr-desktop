import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // 配置文件相关API
  async readSettings() {
    return ipcRenderer.invoke('read-settings')
  },

  async getConfigPaths() {
    return ipcRenderer.invoke('get-config-paths')
  },

  async openConfigFolder() {
    return ipcRenderer.invoke('open-config-folder')
  },

  async saveSettings(configData) {
    return ipcRenderer.invoke('save-settings', configData)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
