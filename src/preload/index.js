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

  async openClaudeConfigFolder() {
    return ipcRenderer.invoke('open-claude-config-folder')
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

  async updateRouterModel(modelType, modelValue) {
    return ipcRenderer.invoke('update-router-model', modelType, modelValue)
  },

  async updateLongContextThreshold(threshold) {
    return ipcRenderer.invoke('update-long-context-threshold', threshold)
  },

  // === Claude配置相关API ===
  async getHomeDir() {
    return ipcRenderer.invoke('get-home-dir')
  },

  async getClaudeSettingsPath() {
    return ipcRenderer.invoke('get-claude-settings-path')
  },

  async readFile(filePath) {
    return ipcRenderer.invoke('read-file', filePath)
  },

  async writeFile(filePath, content) {
    return ipcRenderer.invoke('write-file', filePath, content)
  },

  // 悬浮窗相关API
  updateFloatingWindow(content) {
    ipcRenderer.send('update-floating-window', content)
  },

  // 关闭悬浮窗
  closeFloatingWindow() {
    ipcRenderer.send('close-floating-window')
  },

  // 移动悬浮窗位置的API
  moveFloatingWindow(deltaX, deltaY) {
    ipcRenderer.send('move-floating-window', deltaX, deltaY)
  },

  // 刷新悬浮窗的API
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
  },

  // 检测网络模式
  async detectNetworkMode() {
    return ipcRenderer.invoke('detect-network-mode')
  },

  // 切换网络模式
  async switchNetworkMode(isProxy) {
    return ipcRenderer.invoke('switch-network-mode', isProxy)
  },

  // {{ AURA-X: Add - 监听网络模式变更事件. Approval: 寸止确认. }}
  // 监听网络模式变更事件
  onNetworkModeChanged(callback) {
    ipcRenderer.on('network-mode-changed', callback)
  },

  // 移除网络模式变更事件监听器
  removeNetworkModeChangedListener(callback) {
    ipcRenderer.removeListener('network-mode-changed', callback)
  },



  // === 直连配置相关API ===
  async getDirectConfigPath() {
    return ipcRenderer.invoke('get-direct-config-path')
  },

  async readDirectConfig() {
    return ipcRenderer.invoke('read-direct-config')
  },

  async saveDirectConfig(configData) {
    return ipcRenderer.invoke('save-direct-config', configData)
  },

  async applyDirectConfig(directConfig) {
    return ipcRenderer.invoke('apply-direct-config', directConfig)
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
