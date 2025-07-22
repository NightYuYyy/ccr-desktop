import {
  getClaudeCodeRouterSettingsPath,
  getClaudeCodeRouterConfigDir
} from '../utils/pathUtils.js'
import { readJsonFile, writeJsonFile } from '../utils/fileUtils.js'

/**
 * Claude Code Router 配置模板
 */
const DEFAULT_CONFIG_TEMPLATE = {
  "LOG": false,
  "OPENAI_API_KEY": "",
  "OPENAI_BASE_URL": "",
  "OPENAI_MODEL": "",
  "Providers": [
    {
      "name": "your_provider",
      "api_base_url": "https://api.example.com",
      "api_key": "your_api_key",
      "models": [
        "model1",
        "model2"
      ]
    }
  ],
  "Router": {
    "default": "your_provider,model1"
  }
}

/**
 * 读取 Claude Code Router 配置文件
 * @returns {Promise&lt;{success: boolean, data?: any, error?: string, configPath?: string}&gt;} 配置读取结果
 */
export async function readClaudeCodeRouterSettings() {
  const configPath = getClaudeCodeRouterSettingsPath()
  const configDir = getClaudeCodeRouterConfigDir()

  try {
    const result = await readJsonFile(configPath)

    if (result.success) {
      return {
        success: true,
        data: result.data,
        configPath
      }
    } else {
      // 如果配置文件不存在，提供友好的提示信息
      if (result.error?.includes('配置文件不存在')) {
        return {
          success: false,
          error: `配置文件不存在，请在 ${configPath} 创建配置文件`,
          configPath,
          suggestion: {
            message: `您可以创建目录 ${configDir} 并在其中创建 setting.json 文件`,
            template: DEFAULT_CONFIG_TEMPLATE
          }
        }
      }

      return {
        success: false,
        error: result.error,
        configPath
      }
    }
  } catch (error) {
    return {
      success: false,
      error: `读取配置时发生未知错误: ${error.message}`,
      configPath
    }
  }
}

/**
 * 获取配置文件路径信息
 * @returns {{configPath: string, configDir: string}} 路径信息
 */
export function getConfigPaths() {
  return {
    configPath: getClaudeCodeRouterSettingsPath(),
    configDir: getClaudeCodeRouterConfigDir()
  }
}

/**
 * 保存 Claude Code Router 配置文件
 * @param {any} configData - 要保存的配置数据
 * @returns {Promise<{success: boolean, error?: string, configPath?: string}>} 保存结果
 */
export async function saveClaudeCodeRouterSettings(configData) {
  const configPath = getClaudeCodeRouterSettingsPath()

  try {
    const result = await writeJsonFile(configPath, configData)

    if (result.success) {
      return {
        success: true,
        configPath
      }
    } else {
      return {
        success: false,
        error: result.error,
        configPath
      }
    }
  } catch (error) {
    return {
      success: false,
      error: `保存配置时发生未知错误: ${error.message}`,
      configPath
    }
  }
}

/**
 * 添加新的Provider
 * @param {object} providerData - Provider数据
 * @returns {Promise<{success: boolean, error?: string}>} 操作结果
 */
export async function addProvider(providerData) {
  try {
    // 验证必需字段
    if (!providerData.name || !providerData.api_base_url) {
      return {
        success: false,
        error: 'Provider名称和API地址为必填项'
      }
    }

    // 读取现有配置
    const readResult = await readClaudeCodeRouterSettings()
    if (!readResult.success) {
      return {
        success: false,
        error: `读取配置失败: ${readResult.error}`
      }
    }

    const config = readResult.data

    // 检查名称是否已存在
    if (config.Providers && config.Providers.some(p => p.name === providerData.name)) {
      return {
        success: false,
        error: `Provider名称 "${providerData.name}" 已存在`
      }
    }

    // 初始化Providers数组
    if (!config.Providers) {
      config.Providers = []
    }

    // 添加新Provider
    config.Providers.push({ ...providerData })

    // 保存配置
    return await saveClaudeCodeRouterSettings(config)
  } catch (error) {
    return {
      success: false,
      error: `添加Provider失败: ${error.message}`
    }
  }
}

/**
 * 更新现有的Provider
 * @param {string} providerName - Provider名称
 * @param {object} updatedData - 更新的数据
 * @returns {Promise<{success: boolean, error?: string}>} 操作结果
 */
export async function updateProvider(providerName, updatedData) {
  try {
    if (!providerName) {
      return {
        success: false,
        error: 'Provider名称不能为空'
      }
    }

    // 读取现有配置
    const readResult = await readClaudeCodeRouterSettings()
    if (!readResult.success) {
      return {
        success: false,
        error: `读取配置失败: ${readResult.error}`
      }
    }

    const config = readResult.data

    // 查找要更新的Provider
    if (!config.Providers) {
      return {
        success: false,
        error: '配置中不存在Providers'
      }
    }

    const providerIndex = config.Providers.findIndex(p => p.name === providerName)
    if (providerIndex === -1) {
      return {
        success: false,
        error: `找不到名称为 "${providerName}" 的Provider`
      }
    }

    // 更新Provider数据
    config.Providers[providerIndex] = {
      ...config.Providers[providerIndex],
      ...updatedData,
      name: providerName // 确保名称不被修改
    }

    // 保存配置
    return await saveClaudeCodeRouterSettings(config)
  } catch (error) {
    return {
      success: false,
      error: `更新Provider失败: ${error.message}`
    }
  }
}

/**
 * 删除Provider
 * @param {string} providerName - 要删除的Provider名称
 * @returns {Promise<{success: boolean, error?: string}>} 操作结果
 */
export async function deleteProvider(providerName) {
  try {
    if (!providerName) {
      return {
        success: false,
        error: 'Provider名称不能为空'
      }
    }

    // 读取现有配置
    const readResult = await readClaudeCodeRouterSettings()
    if (!readResult.success) {
      return {
        success: false,
        error: `读取配置失败: ${readResult.error}`
      }
    }

    const config = readResult.data

    // 查找要删除的Provider
    if (!config.Providers) {
      return {
        success: false,
        error: '配置中不存在Providers'
      }
    }

    const providerIndex = config.Providers.findIndex(p => p.name === providerName)
    if (providerIndex === -1) {
      return {
        success: false,
        error: `找不到名称为 "${providerName}" 的Provider`
      }
    }

    // 删除Provider
    config.Providers.splice(providerIndex, 1)

    // 检查是否需要更新默认路由
    if (config.Router && config.Router.default && config.Router.default.startsWith(providerName + ',')) {
      config.Router.default = ''
      console.log(`[ConfigService] 已清空默认路由，因为删除了Provider: ${providerName}`)
    }

    // 保存配置
    return await saveClaudeCodeRouterSettings(config)
  } catch (error) {
    return {
      success: false,
      error: `删除Provider失败: ${error.message}`
    }
  }
}

/**
 * 更新默认模型选择
 * @param {string} defaultModel - 默认模型 (格式: "providerName,modelName")
 * @returns {Promise<{success: boolean, error?: string}>} 操作结果
 */
export async function updateDefaultModel(defaultModel) {
  try {
    // 验证格式
    if (defaultModel && !defaultModel.includes(',')) {
      return {
        success: false,
        error: '默认模型格式错误，应为 "providerName,modelName"'
      }
    }

    // 读取现有配置
    const readResult = await readClaudeCodeRouterSettings()
    if (!readResult.success) {
      return {
        success: false,
        error: `读取配置失败: ${readResult.error}`
      }
    }

    const config = readResult.data

    // 如果提供了默认模型，验证其存在性
    if (defaultModel) {
      const [providerName, modelName] = defaultModel.split(',')
      const provider = config.Providers?.find(p => p.name === providerName)

      if (!provider) {
        return {
          success: false,
          error: `找不到Provider: ${providerName}`
        }
      }

      if (!provider.models || !provider.models.includes(modelName)) {
        return {
          success: false,
          error: `Provider "${providerName}" 中找不到模型: ${modelName}`
        }
      }
    }

    // 初始化Router配置
    if (!config.Router) {
      config.Router = {}
    }

    // 更新默认模型
    config.Router.default = defaultModel || ''

    // 保存配置
    return await saveClaudeCodeRouterSettings(config)
  } catch (error) {
    return {
      success: false,
      error: `更新默认模型失败: ${error.message}`
    }
  }
}


