import { ipcMain } from 'electron'
import {
  readClaudeCodeRouterSettings,
  getConfigPaths
} from '../services/configService.js'

/**
 * 注册配置相关的IPC处理器
 */
export function registerConfigHandlers() {
  // 读取设置文件的处理器
  ipcMain.handle('read-settings', async () => {
    try {
      console.log('[ConfigHandler] 开始读取 Claude Code Router 配置文件')

      const result = await readClaudeCodeRouterSettings()

      if (result.success) {
        console.log('[ConfigHandler] 配置文件读取成功:', result.configPath)
        return {
          success: true,
          data: result.data,
          configPath: result.configPath
        }
      } else {
        console.warn('[ConfigHandler] 配置文件读取失败:', result.error)
        return {
          success: false,
          error: result.error,
          configPath: result.configPath,
          suggestion: result.suggestion
        }
      }
    } catch (error) {
      console.error('[ConfigHandler] 处理配置读取请求时发生错误:', error)
      return {
        success: false,
        error: `处理请求时发生错误: ${error.message}`
      }
    }
  })

  // 获取配置文件路径的处理器
  ipcMain.handle('get-config-paths', async () => {
    try {
      const paths = getConfigPaths()
      console.log('[ConfigHandler] 返回配置路径信息:', paths)
      return {
        success: true,
        data: paths
      }
    } catch (error) {
      console.error('[ConfigHandler] 获取配置路径失败:', error)
      return {
        success: false,
        error: `获取配置路径失败: ${error.message}`
      }
    }
  })



  console.log('[ConfigHandler] 配置处理器注册完成')
}

/**
 * 注销配置相关的IPC处理器
 */
export function unregisterConfigHandlers() {
  ipcMain.removeHandler('read-settings')
  ipcMain.removeHandler('get-config-paths')
  console.log('[ConfigHandler] 配置处理器注销完成')
}
