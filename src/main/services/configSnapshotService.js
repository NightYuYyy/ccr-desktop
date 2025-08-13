import { ConfigManager } from './configManager.js'
import { readJsonFile } from '../utils/fileUtils.js'

/**
 * 配置快照服务
 * 用于读取Claude和CCR配置并创建快照用于备份
 */

/**
 * 读取CCR配置快照数据
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function readCCRConfigSnapshot() {
  try {
    const configPath = ConfigManager.getCCRPaths().configPath
    const result = await readJsonFile(configPath)
    
    if (result.success) {
      // 提取需要备份的CCR配置信息
      const config = result.data
      const snapshot = {
        providers: config.Providers?.map(provider => ({
          name: provider.name,
          models: provider.models || []
        })) || [],
        router: {
          default: config.Router?.default || '',
          background: config.Router?.background || '',
          think: config.Router?.think || '',
          longContext: config.Router?.longContext || '',
          longContextThreshold: config.Router?.longContextThreshold || 5000
        }
      }
      
      return {
        success: true,
        data: snapshot
      }
    } else {
      return result
    }
  } catch (error) {
    return {
      success: false,
      error: `读取CCR配置快照失败: ${error.message}`
    }
  }
}

/**
 * 读取直连配置快照数据
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function readClaudeConfigSnapshot() {
  try {
    const configPath = ConfigManager.getDirectConfigPath()
    const result = await readJsonFile(configPath)
    
    if (result.success) {
      // 提取需要备份的直连配置信息
      const config = result.data
      const snapshot = {
        directConfigs: config.directConfigs || [],
        settings: config.settings || {}
      }
      
      return {
        success: true,
        data: snapshot
      }
    } else {
      return result
    }
  } catch (error) {
    return {
      success: false,
      error: `读取直连配置快照失败: ${error.message}`
    }
  }
}

/**
 * 创建完整的配置快照
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function createConfigSnapshot() {
  try {
    // 并行读取两个配置的快照
    const [ccrSnapshot, claudeSnapshot] = await Promise.all([
      readCCRConfigSnapshot(),
      readClaudeConfigSnapshot()
    ])
    
    if (!ccrSnapshot.success) {
      return {
        success: false,
        error: `读取CCR配置失败: ${ccrSnapshot.error}`
      }
    }
    
    if (!claudeSnapshot.success) {
      return {
        success: false,
        error: `读取Claude配置失败: ${claudeSnapshot.error}`
      }
    }
    
    const snapshot = {
      ccrConfig: ccrSnapshot.data,
      directConfig: claudeSnapshot.data,
      timestamp: new Date().toISOString()
    }
    
    return {
      success: true,
      data: snapshot
    }
  } catch (error) {
    return {
      success: false,
      error: `创建配置快照失败: ${error.message}`
    }
  }
}