import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // 配置文件相关API
  async readSettings() {
    const result = await ipcRenderer.invoke('read-settings')
    return result.success ? result.data : result
  },

  async getConfigPaths() {
    const result = await ipcRenderer.invoke('get-config-paths')
    return result.success ? result.data : result
  },

  async openConfigFolder() {
    const result = await ipcRenderer.invoke('open-config-folder')
    return result.success ? result.data : result
  },

  async openClaudeConfigFolder() {
    const result = await ipcRenderer.invoke('open-claude-config-folder')
    return result.success ? result.data : result
  },

  async saveSettings(configData) {
    const result = await ipcRenderer.invoke('save-settings', configData)
    return result.success ? result.data : result
  },

  async execCommand(command) {
    const result = await ipcRenderer.invoke('exec-command', command)
    return result.success ? result.data : result
  },

  // 监听命令实时输出
  onCommandOutput(callback) {
    ipcRenderer.on('command-output', (event, data) => {
      callback(data)
    })
  },

  // 移除命令输出监听器
  removeCommandOutputListener(callback) {
    ipcRenderer.removeListener('command-output', callback)
  },

  // === 细粒度配置操作API ===
  async addProvider(providerData) {
    const result = await ipcRenderer.invoke('add-provider', providerData)
    return result.success ? result.data : result
  },

  async updateProvider(providerName, updatedData) {
    const result = await ipcRenderer.invoke('update-provider', providerName, updatedData)
    return result.success ? result.data : result
  },

  async deleteProvider(providerName) {
    const result = await ipcRenderer.invoke('delete-provider', providerName)
    return result.success ? result.data : result
  },

  async updateDefaultModel(defaultModel) {
    const result = await ipcRenderer.invoke('update-default-model', defaultModel)
    return result.success ? result.data : result
  },

  async updateRouterModel(modelType, modelValue) {
    const result = await ipcRenderer.invoke('update-router-model', modelType, modelValue)
    return result.success ? result.data : result
  },

  async updateLongContextThreshold(threshold) {
    const result = await ipcRenderer.invoke('update-long-context-threshold', threshold)
    return result.success ? result.data : result
  },

  // === Claude配置相关API ===
  async getHomeDir() {
    const result = await ipcRenderer.invoke('get-home-dir')
    return result.success ? result.data : result
  },

  async getClaudeSettingsPath() {
    const result = await ipcRenderer.invoke('get-claude-settings-path')
    return result.success ? result.data : result
  },

  async readFile(filePath) {
    const result = await ipcRenderer.invoke('read-file', filePath)
    return result.success ? result.data : result
  },

  async writeFile(filePath, content) {
    const result = await ipcRenderer.invoke('write-file', filePath, content)
    return result.success ? result.data : result
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
    ipcRenderer.on('update-content', (event, data) => {
      callback(event, data)
    })
  },

  // 移除悬浮窗内容更新监听器
  removeUpdateContentListener(callback) {
    ipcRenderer.removeListener('update-content', callback)
  },

  // 检测网络模式
  async detectNetworkMode() {
    const result = await ipcRenderer.invoke('detect-network-mode')
    return result.success ? result.data : result
  },

  // 切换网络模式
  async switchNetworkMode(isProxy) {
    const result = await ipcRenderer.invoke('switch-network-mode', isProxy)
    return result.success ? result.data : result
  },

  // {{ AURA-X: Add - 监听网络模式变更事件. Approval: 寸止确认. }}
  // 监听网络模式变更事件
  onNetworkModeChanged(callback) {
    ipcRenderer.on('network-mode-changed', (event, data) => {
      callback(data)
    })
  },

  // 移除网络模式变更事件监听器
  removeNetworkModeChangedListener(callback) {
    ipcRenderer.removeListener('network-mode-changed', callback)
  },

  // === 直连配置相关API ===
  async getDirectConfigPath() {
    const result = await ipcRenderer.invoke('get-direct-config-path')
    return result.success ? result.data : result
  },

  async readDirectConfig() {
    const result = await ipcRenderer.invoke('read-direct-config')
    return result.success ? result.data : result
  },

  async saveDirectConfig(configData) {
    const result = await ipcRenderer.invoke('save-direct-config', configData)
    return result.success ? result.data : result
  },

  async applyDirectConfig(directConfig) {
    const result = await ipcRenderer.invoke('apply-direct-config', directConfig)
    return result.success ? result.data : result
  },

  // === WebDAV相关API ===
  async setWebdavConfig(config) {
    const result = await ipcRenderer.invoke('set-webdav-config', config)
    return result.success ? result.data : result
  },

  async getWebdavConfig() {
    const result = await ipcRenderer.invoke('get-webdav-config')
    return result.success ? result.data : result
  },

  async testWebdavConnection() {
    const result = await ipcRenderer.invoke('test-webdav-connection')
    return result.success ? result.data : result
  },

  async backupDataWebdav() {
    const result = await ipcRenderer.invoke('backup-data-webdav')
    return result.success ? result.data : result
  },

  async listWebdavBackups() {
    const result = await ipcRenderer.invoke('list-webdav-backups')
    return result.success ? result.data : result
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
