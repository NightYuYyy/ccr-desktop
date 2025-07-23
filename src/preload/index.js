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
  },

  // 悬浮窗相关API
  updateFloatingWindow(content) {
    ipcRenderer.send('update-floating-window', content)
  },

  // 关闭悬浮窗
  closeFloatingWindow() {
    ipcRenderer.send('close-floating-window')
  },

  // {{ AURA-X: Add - 新增移动悬浮窗位置的API. Approval: 寸止确认. }}
  moveFloatingWindow(deltaX, deltaY) {
    ipcRenderer.send('move-floating-window', deltaX, deltaY)
  },

  // {{ AURA-X: Add - 新增刷新悬浮窗的API. Approval: 寸止确认. }}
  refreshFloatingWindow() {
    ipcRenderer.send('refresh-floating-window')
  },

  // 监听悬浮窗内容更新
  onUpdateContent(callback) {
    ipcRenderer.on('update-content', callback)
  },

  // 移除悬浮窗内容更新监听器
  removeUpdateContentListener(callback) {
    ipcRenderer.removeListener('update-content', callback)
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
