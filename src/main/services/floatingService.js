import { readClaudeCodeRouterSettings } from './configService.js'
import { ConfigManager } from './configManager.js'
import { readJsonFile } from '../utils/fileUtils.js'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * 统一的悬浮窗信息服务
 * 集中处理模型信息获取和服务状态检测逻辑，避免重复代码
 */
export class FloatingService {
  // CCR服务URL常量
  static CCR_SERVICE_URL = 'http://127.0.0.1:3456'
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
      const configPath = ConfigManager.getClaudeSettingsPath()
      const result = await readJsonFile(configPath)

      if (result.success && result.data && result.data.env) {
        const baseUrl = result.data.env.ANTHROPIC_BASE_URL
        const isUsingCCR = baseUrl === this.CCR_SERVICE_URL

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
      const directConfigPath = ConfigManager.getDirectConfigPath()
      const directConfigResult = await readJsonFile(directConfigPath)

      if (directConfigResult.success && directConfigResult.data) {
        const directData = directConfigResult.data
        const configs = directData.directConfigs || []

        // 获取当前Claude settings.json中的BASE_URL和API_KEY
        const claudeSettingsPath = ConfigManager.getClaudeSettingsPath()
        const claudeSettingsResult = await readJsonFile(claudeSettingsPath)

        let currentBaseUrl = null
        let currentApiKey = null
        let isUsingApiKey = false
        if (claudeSettingsResult.success && claudeSettingsResult.data?.env) {
          currentBaseUrl = claudeSettingsResult.data.env.ANTHROPIC_BASE_URL
          // 检查两种认证方式
          currentApiKey =
            claudeSettingsResult.data.env.ANTHROPIC_AUTH_TOKEN ||
            claudeSettingsResult.data.env.ANTHROPIC_API_KEY
          isUsingApiKey = !!claudeSettingsResult.data.env.ANTHROPIC_API_KEY
          // 去掉末尾的斜杠以便匹配
          if (currentBaseUrl) {
            currentBaseUrl = currentBaseUrl.replace(/\/$/, '')
          }
        }

        // 查找匹配当前BASE_URL和API_KEY的配置，考虑认证方式
        let currentConfig = null
        if (currentBaseUrl) {
          currentConfig = configs.find((c) => {
            const configUrl = c.baseUrl.replace(/\/$/, '')
            const configUseApiKey = c.useApiKey || false

            // 如果配置使用API Key认证，需要匹配API_KEY
            if (configUseApiKey) {
              return (
                configUrl === currentBaseUrl &&
                c.apiKey === currentApiKey &&
                configUseApiKey === isUsingApiKey
              )
            } else {
              // 如果配置使用Token认证，只需要匹配BASE_URL
              return configUrl === currentBaseUrl
            }
          })
        }

        // 如果找到匹配的配置，使用它，并显示认证方式
        if (currentConfig) {
          const authType = currentConfig.useApiKey ? 'API Key' : 'Token'
          return `🔌 直连(${authType}) | ${currentConfig.name}`
        }

        // 如果没有找到匹配的，查找默认配置
        const defaultConfig = this.findDefaultConfig(configs, directData)

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
   * 查找默认配置
   * @param {Array} configs - 配置数组
   * @param {Object} directData - 直连配置数据
   * @returns {Object|null} 默认配置对象
   */
  static findDefaultConfig(configs, directData) {
    if (!configs || configs.length === 0) {
      return null
    }

    // 优先使用指定的默认配置
    if (directData?.settings?.defaultConfig) {
      const defaultConfig = configs.find((c) => c.name === directData.settings.defaultConfig)
      if (defaultConfig) {
        return defaultConfig
      }
    }

    // 查找标记为默认的配置
    const markedDefault = configs.find((c) => c.isDefault)
    if (markedDefault) {
      return markedDefault
    }

    // 使用第一个配置
    return configs[0]
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
