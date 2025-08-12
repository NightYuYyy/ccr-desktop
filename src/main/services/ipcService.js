import { ipcMain, ipcRenderer } from 'electron'

/**
 * 统一IPC通信服务
 * 封装所有IPC通信逻辑，提供类型安全的调用接口和统一的错误处理
 */

// 主进程IPC服务类
export class MainIPCService {
  /**
   * 注册带错误处理的IPC处理器
   * @param {string} channel - IPC通道名称
   * @param {Function} handler - 处理函数
   */
  static handle(channel, handler) {
    ipcMain.handle(channel, async (event, ...args) => {
      try {
        const result = await handler(event, ...args)
        return { success: true, data: result }
      } catch (error) {
        console.error(`[IPC] 处理失败: ${channel}`, error)
        return {
          success: false,
          error: error.message || '未知错误',
          code: error.code || 'UNKNOWN_ERROR'
        }
      }
    })
  }

  /**
   * 注册无返回值的IPC监听器
   * @param {string} channel - IPC通道名称
   * @param {Function} listener - 监听函数
   */
  static on(channel, listener) {
    ipcMain.on(channel, (event, ...args) => {
      try {
        listener(event, ...args)
      } catch (error) {
        console.error(`[IPC] 处理消息失败: ${channel}`, error)
      }
    })
  }

  /**
   * 发送消息到渲染进程
   * @param {Electron.WebContents} webContents - 渲染进程webContents
   * @param {string} channel - IPC通道名称
   * @param {...any} args - 消息参数
   */
  static send(webContents, channel, ...args) {
    if (webContents && !webContents.isDestroyed()) {
      webContents.send(channel, ...args)
    }
  }

  /**
   * 移除IPC处理器
   * @param {string} channel - IPC通道名称
   */
  static removeHandler(channel) {
    ipcMain.removeHandler(channel)
  }

  /**
   * 移除IPC监听器
   * @param {string} channel - IPC通道名称
   * @param {Function} listener - 监听函数
   */
  static removeListener(channel, listener) {
    ipcMain.removeListener(channel, listener)
  }
}

// 渲染进程IPC服务类
export class RendererIPCService {
  /**
   * 调用主进程方法
   * @param {string} channel - IPC通道名称
   * @param {...any} args - 调用参数
   * @returns {Promise<any>} 调用结果
   */
  static async invoke(channel, ...args) {
    try {
      const result = await ipcRenderer.invoke(channel, ...args)

      if (result && typeof result === 'object' && !result.success) {
        throw new Error(result.error || 'IPC调用失败')
      }

      return result
    } catch (error) {
      console.error(`[IPC] 调用失败: ${channel}`, error)
      throw error
    }
  }

  /**
   * 发送消息到主进程
   * @param {string} channel - IPC通道名称
   * @param {...any} args - 消息参数
   */
  static send(channel, ...args) {
    ipcRenderer.send(channel, ...args)
  }

  /**
   * 监听主进程消息
   * @param {string} channel - IPC通道名称
   * @param {Function} listener - 监听函数
   */
  static on(channel, listener) {
    ipcRenderer.on(channel, (event, ...args) => {
      try {
        listener(event, ...args)
      } catch (error) {
        console.error(`[IPC] 处理消息失败: ${channel}`, error)
      }
    })
  }

  /**
   * 移除消息监听器
   * @param {string} channel - IPC通道名称
   * @param {Function} listener - 监听函数
   */
  static removeListener(channel, listener) {
    ipcRenderer.removeListener(channel, listener)
  }
}

// IPC通道常量定义
export const IPC_CHANNELS = {
  // 配置相关
  READ_SETTINGS: 'read-settings',
  GET_CONFIG_PATHS: 'get-config-paths',
  OPEN_CONFIG_FOLDER: 'open-config-folder',
  OPEN_CLAUDE_CONFIG_FOLDER: 'open-claude-config-folder',
  SAVE_SETTINGS: 'save-settings',
  EXEC_COMMAND: 'exec-command',
  COMMAND_OUTPUT: 'command-output',

  // Provider相关
  ADD_PROVIDER: 'add-provider',
  UPDATE_PROVIDER: 'update-provider',
  DELETE_PROVIDER: 'delete-provider',

  // 路由器相关
  UPDATE_DEFAULT_MODEL: 'update-default-model',
  UPDATE_ROUTER_MODEL: 'update-router-model',
  UPDATE_LONG_CONTEXT_THRESHOLD: 'update-long-context-threshold',

  // Claude配置相关
  GET_HOME_DIR: 'get-home-dir',
  GET_CLAUDE_SETTINGS_PATH: 'get-claude-settings-path',
  READ_FILE: 'read-file',
  WRITE_FILE: 'write-file',

  // 悬浮窗相关
  UPDATE_FLOATING_WINDOW: 'update-floating-window',
  CLOSE_FLOATING_WINDOW: 'close-floating-window',
  MOVE_FLOATING_WINDOW: 'move-floating-window',
  REFRESH_FLOATING_WINDOW: 'refresh-floating-window',
  UPDATE_CONTENT: 'update-content',

  // 网络模式相关
  DETECT_NETWORK_MODE: 'detect-network-mode',
  SWITCH_NETWORK_MODE: 'switch-network-mode',
  NETWORK_MODE_CHANGED: 'network-mode-changed',

  // 直连配置相关
  GET_DIRECT_CONFIG_PATH: 'get-direct-config-path',
  READ_DIRECT_CONFIG: 'read-direct-config',
  SAVE_DIRECT_CONFIG: 'save-direct-config',
  APPLY_DIRECT_CONFIG: 'apply-direct-config',

  // WebDAV相关
  SET_WEBDAV_CONFIG: 'set-webdav-config',
  GET_WEBDAV_CONFIG: 'get-webdav-config',
  TEST_WEBDAV_CONNECTION: 'test-webdav-connection',
  BACKUP_DATA_WEBDAV: 'backup-data-webdav',
  LIST_WEBDAV_BACKUPS: 'list-webdav-backups',

  // 监听器相关
  ON_COMMAND_OUTPUT: 'command-output',
  REMOVE_COMMAND_OUTPUT_LISTENER: 'command-output',
  ON_UPDATE_CONTENT: 'update-content',
  REMOVE_UPDATE_CONTENT_LISTENER: 'update-content',
  ON_NETWORK_MODE_CHANGED: 'network-mode-changed',
  REMOVE_NETWORK_MODE_CHANGED_LISTENER: 'network-mode-changed'
}
