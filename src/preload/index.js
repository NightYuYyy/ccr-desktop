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
  },

  async execCommand(command) {
    return ipcRenderer.invoke('exec-command', command)
  },

  // 监听命令实时输出
  onCommandOutput(callback) {
    ipcRenderer.on('command-output', callback)
  },

  // 移除命令输出监听器
  removeCommandOutputListener(callback) {
    ipcRenderer.removeListener('command-output', callback)
  },

  // === 细粒度配置操作API ===
  async addProvider(providerData) {
    return ipcRenderer.invoke('add-provider', providerData)
  },

  async updateProvider(providerName, updatedData) {
    return ipcRenderer.invoke('update-provider', providerName, updatedData)
  },

  async deleteProvider(providerName) {
    return ipcRenderer.invoke('delete-provider', providerName)
  },

  async updateDefaultModel(defaultModel) {
    return ipcRenderer.invoke('update-default-model', defaultModel)
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
