import { readClaudeCodeRouterSettings } from './configService.js'
// {{ AURA-X: Add - 导入网络模式检测相关功能. Approval: 寸止确认. }}
import { getClaudeSettingsPath, getDirectConfigPath } from '../utils/pathUtils.js'
import { readJsonFile } from '../utils/fileUtils.js'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * 统一的悬浮窗信息服务
 * 集中处理模型信息获取和服务状态检测逻辑，避免重复代码
 */
export class FloatingService {
  /**
   * 获取当前模型信息
   * @returns {Promise<{modelName: string}>}
   */
  static async getCurrentInfo() {
    try {
      // 获取当前模型名称
      const modelName = await this.getCurrentModelName()

      return { modelName }
    } catch (error) {
      console.error('[FloatingService] 获取信息失败:', error)
      return { modelName: '获取失败' }
    }
  }

  /**
   * 获取当前配置的模型名称
   * @returns {Promise<string>}
   */
  static async getCurrentModelName() {
    try {
      // {{ AURA-X: Modify - 先检测网络模式，然后返回相应的信息. Approval: 寸止确认. }}
      // 检测网络模式
      const networkMode = await this.detectNetworkMode()

      if (networkMode.isProxy) {
        // 代理模式：显示CCR配置的模型
        return await this.getCCRModelName()
      } else {
        // 直连模式：显示直连配置的服务商
        return await this.getDirectModelName()
      }
    } catch (error) {
      console.error('[FloatingService] 获取模型名称失败:', error)
      return '获取失败'
    }
  }

  /**
   * 检测网络模式
   * @returns {Promise<{isProxy: boolean, mode: string}>}
   */
  static async detectNetworkMode() {
    try {
      const configPath = getClaudeSettingsPath()
      const result = await readJsonFile(configPath)

      if (result.success && result.data && result.data.env) {
        const baseUrl = result.data.env.ANTHROPIC_BASE_URL
        const CCR_SERVICE_URL = 'http://127.0.0.1:3456'
        const isUsingCCR = baseUrl === CCR_SERVICE_URL

        return {
          isProxy: isUsingCCR,
          mode: isUsingCCR ? 'proxy' : 'direct'
        }
      }

      return { isProxy: false, mode: 'direct' }
    } catch (error) {
      console.error('[FloatingService] 检测网络模式失败:', error)
      return { isProxy: false, mode: 'direct' }
    }
  }

  /**
   * 获取CCR配置的模型名称（代理模式）
   * @returns {Promise<string>}
   */
  static async getCCRModelName() {
    try {
      const configResult = await readClaudeCodeRouterSettings()

      if (configResult.success && configResult.data) {
        if (configResult.data.Router?.default) {
          const [providerName, model] = configResult.data.Router.default.split(',')

          if (providerName && model) {
            return `🔗 代理 | ${providerName}/${model}`
          }
        }
      }

      return '🔗 代理 | 未设置模型'
    } catch (error) {
      console.error('[FloatingService] 获取CCR模型名称失败:', error)
      return '🔗 代理 | 获取失败'
    }
  }

  /**
   * 获取直连配置的服务商名称（直连模式）
   * @returns {Promise<string>}
   */
  static async getDirectModelName() {
    try {
      const directConfigPath = getDirectConfigPath()
      const directConfigResult = await readJsonFile(directConfigPath)

      if (directConfigResult.success && directConfigResult.data) {
        const directData = directConfigResult.data
        const configs = directData.directConfigs || []

        // 获取当前Claude settings.json中的BASE_URL
        const claudeSettingsPath = getClaudeSettingsPath()
        const claudeSettingsResult = await readJsonFile(claudeSettingsPath)

        let currentBaseUrl = null
        if (claudeSettingsResult.success && claudeSettingsResult.data?.env?.ANTHROPIC_BASE_URL) {
          currentBaseUrl = claudeSettingsResult.data.env.ANTHROPIC_BASE_URL
          // 去掉末尾的斜杠以便匹配
          currentBaseUrl = currentBaseUrl.replace(/\/$/, '')
        }

        // 查找匹配当前BASE_URL的配置
        let currentConfig = null
        if (currentBaseUrl) {
          currentConfig = configs.find((c) => {
            const configUrl = c.baseUrl.replace(/\/$/, '')
            return configUrl === currentBaseUrl
          })
        }

        // 如果找到匹配的配置，使用它
        if (currentConfig) {
          return `🔌 直连 | ${currentConfig.name}`
        }

        // 如果没有找到匹配的，按原来的逻辑查找默认配置
        let defaultConfig = null

        // 优先使用指定的默认配置
        if (directData.settings && directData.settings.defaultConfig) {
          defaultConfig = configs.find((c) => c.name === directData.settings.defaultConfig)
        }

        // 如果没有指定默认配置，查找标记为默认的配置
        if (!defaultConfig) {
          defaultConfig = configs.find((c) => c.isDefault)
        }

        // 如果还没有，使用第一个配置
        if (!defaultConfig && configs.length > 0) {
          defaultConfig = configs[0]
        }

        if (defaultConfig) {
          return `🔌 直连 | ${defaultConfig.name}`
        }
      }

      return '🔌 直连 | 官方API'
    } catch (error) {
      console.error('[FloatingService] 获取直连配置失败:', error)
      return '🔌 直连 | 获取失败'
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
