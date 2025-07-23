import { readClaudeCodeRouterSettings } from './configService.js'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * 统一的悬浮窗信息服务
 * 集中处理模型信息获取和服务状态检测逻辑，避免重复代码
 */
export class FloatingService {
  /**
   * 获取当前模型信息和服务状态
   * @returns {Promise<{modelName: string, isRunning: boolean}>}
   */
  static async getCurrentInfo() {
    try {
      // 获取当前模型名称
      const modelName = await this.getCurrentModelName()

      // 检查服务状态
      const isRunning = await this.checkServiceStatus()

      return { modelName, isRunning }
    } catch (error) {
      console.error('[FloatingService] 获取信息失败:', error)
      return { modelName: '获取失败', isRunning: false }
    }
  }

  /**
   * 获取当前配置的模型名称
   * @returns {Promise<string>}
   */
  static async getCurrentModelName() {
    try {
      const configResult = await readClaudeCodeRouterSettings()

      if (configResult.success && configResult.data.Router?.default) {
        const [providerName, model] = configResult.data.Router.default.split(',')
        if (providerName && model) {
          return `${providerName}/${model}`
        }
      }

      return '未设置模型'
    } catch (error) {
      console.error('[FloatingService] 获取模型名称失败:', error)
      return '获取失败'
    }
  }

  /**
   * 检查CCR服务运行状态
   * @returns {Promise<boolean>}
   */
  static async checkServiceStatus() {
    try {
      const { stdout } = await execAsync('ccr status')
      const output = stdout.toLowerCase()
      return output.includes('running') && !output.includes('not running')
    } catch {
      // ccr命令不存在或执行失败，认为服务未运行
      return false
    }
  }
}
