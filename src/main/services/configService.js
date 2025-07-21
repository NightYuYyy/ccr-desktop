import {
  getClaudeCodeRouterSettingsPath,
  getClaudeCodeRouterConfigDir
} from '../utils/pathUtils.js'
import { readJsonFile } from '../utils/fileUtils.js'

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


