import { ConfigManager } from './configManager.js'
import { readJsonFile, writeJsonFile } from '../utils/fileUtils.js'
import { readCCRDesktopConfig, saveCCRDesktopConfig } from './ccrDesktopConfigService.js'

/**
 * 配置恢复服务
 * 从备份快照恢复Claude和CCR配置
 */

/**
 * 从快照恢复CCR配置
 * @param {object} ccrSnapshot - CCR配置快照
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function restoreCCRConfigFromSnapshot(ccrSnapshot) {
  try {
    if (!ccrSnapshot) {
      return {
        success: false,
        error: 'CCR配置快照为空'
      }
    }
    
    // 获取CCR配置文件路径
    const configPath = ConfigManager.getCCRPaths().configPath
    
    // 读取现有的CCR配置
    const readResult = await readJsonFile(configPath)
    let existingConfig = {}
    
    if (readResult.success) {
      existingConfig = readResult.data
    }
    
    // 从快照恢复配置
    // 保留原有的非路由配置
    const restoredConfig = {
      ...existingConfig,
      Providers: ccrSnapshot.providers?.map(provider => ({
        name: provider.name,
        models: provider.models || []
        // 注意：这里不包含api_base_url和api_key，因为这些是敏感信息，不应该在快照中存储
      })) || [],
      Router: {
        ...existingConfig.Router,
        default: ccrSnapshot.router?.default || '',
        background: ccrSnapshot.router?.background || '',
        think: ccrSnapshot.router?.think || '',
        longContext: ccrSnapshot.router?.longContext || '',
        longContextThreshold: ccrSnapshot.router?.longContextThreshold || 5000
      }
    }
    
    // 保存恢复的配置
    const saveResult = await writeJsonFile(configPath, restoredConfig)
    return saveResult
  } catch (error) {
    return {
      success: false,
      error: `恢复CCR配置失败: ${error.message}`
    }
  }
}

/**
 * 从快照恢复直连配置
 * @param {object} claudeSnapshot - 直连配置快照
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function restoreClaudeConfigFromSnapshot(claudeSnapshot) {
  try {
    if (!claudeSnapshot) {
      return {
        success: false,
        error: '直连配置快照为空'
      }
    }
    
    // 获取直连配置文件路径
    const configPath = ConfigManager.getDirectConfigPath()
    
    // 读取现有的直连配置
    const readResult = await readJsonFile(configPath)
    let existingConfig = {}
    
    if (readResult.success) {
      existingConfig = readResult.data
    }
    
    // 从快照恢复配置
    const restoredConfig = {
      ...existingConfig,
      directConfigs: claudeSnapshot.directConfigs || [],
      settings: claudeSnapshot.settings || {}
    }
    
    // 保存恢复的配置
    const saveResult = await writeJsonFile(configPath, restoredConfig)
    return saveResult
  } catch (error) {
    return {
      success: false,
      error: `恢复直连配置失败: ${error.message}`
    }
  }
}

/**
 * 从统一配置文件的快照恢复所有配置
 * @param {object} snapshotData - 快照数据
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function restoreFromSnapshot(snapshotData) {
  try {
    if (!snapshotData) {
      return {
        success: false,
        error: '快照数据为空'
      }
    }
    
    // 并行恢复两个配置
    const [ccrResult, claudeResult] = await Promise.all([
      restoreCCRConfigFromSnapshot(snapshotData.ccrConfig),
      restoreClaudeConfigFromSnapshot(snapshotData.directConfig)
    ])
    
    if (!ccrResult.success) {
      return {
        success: false,
        error: `恢复CCR配置失败: ${ccrResult.error}`
      }
    }
    
    if (!claudeResult.success) {
      return {
        success: false,
        error: `恢复Claude配置失败: ${claudeResult.error}`
      }
    }
    
    return {
      success: true,
      message: '配置恢复成功'
    }
  } catch (error) {
    return {
      success: false,
      error: `恢复配置失败: ${error.message}`
    }
  }
}

/**
 * 从备份文件恢复配置
 * @param {string} backupFilePath - 备份文件路径
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function restoreFromBackupFile(backupFilePath) {
  try {
    // 读取备份文件
    const readResult = await readJsonFile(backupFilePath)
    if (!readResult.success) {
      return {
        success: false,
        error: `读取备份文件失败: ${readResult.error}`
      }
    }
    
    const backupData = readResult.data
    
    // 检查是否包含快照数据
    if (!backupData.backupSnapshot) {
      return {
        success: false,
        error: '备份文件不包含配置快照数据'
      }
    }
    
    // 从快照恢复配置
    return await restoreFromSnapshot(backupData.backupSnapshot)
  } catch (error) {
    return {
      success: false,
      error: `从备份文件恢复配置失败: ${error.message}`
    }
  }
}