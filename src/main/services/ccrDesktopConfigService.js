import { getCCRDesktopConfigPath } from '../utils/pathUtils.js'
import { readJsonFile, writeJsonFile } from '../utils/fileUtils.js'
import { mkdir } from 'fs/promises'
import { dirname } from 'path'

/**
 * CCR Desktop统一配置服务
 * 管理 ~/.ccr-desktop/config.json 配置文件
 */

// 默认配置结构
const DEFAULT_CONFIG = {
  version: '1.0',
  lastModified: new Date().toISOString(),
  directConfigs: [],
  webdavConfig: {
    server: '',
    username: '',
    password: '',
    remotePath: '/ccr-backups'
  },
  appSettings: {
    networkMode: 'proxy', // 'proxy' | 'direct'
    defaultDirectConfig: '',
    autoBackup: false,
    backupInterval: 24 // hours
  },
  backupSnapshot: {
    ccrConfig: null,
    directConfig: null,
    timestamp: null
  }
}

/**
 * 确保配置目录存在
 * @returns {Promise<void>}
 */
async function ensureConfigDir() {
  const configPath = getCCRDesktopConfigPath()
  const configDir = dirname(configPath)
  await mkdir(configDir, { recursive: true })
}

/**
 * 初始化CCR Desktop配置文件
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function initCCRDesktopConfig() {
  try {
    await ensureConfigDir()
    const configPath = getCCRDesktopConfigPath()

    // 检查配置文件是否存在
    const readResult = await readJsonFile(configPath)
    if (!readResult.success) {
      // 配置文件不存在，创建默认配置
      const writeResult = await writeJsonFile(configPath, DEFAULT_CONFIG)
      if (!writeResult.success) {
        return {
          success: false,
          error: `创建配置文件失败: ${writeResult.error}`
        }
      }
      console.log('[CCRDesktopConfig] 默认配置文件已创建:', configPath)
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: `初始化配置文件失败: ${error.message}`
    }
  }
}

/**
 * 读取CCR Desktop配置文件
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function readCCRDesktopConfig() {
  try {
    const configPath = getCCRDesktopConfigPath()
    const result = await readJsonFile(configPath)

    if (result.success) {
      return result
    } else {
      // 如果配置文件不存在，初始化并返回默认配置
      if (result.error?.includes('配置文件不存在')) {
        const initResult = await initCCRDesktopConfig()
        if (initResult.success) {
          return {
            success: true,
            data: { ...DEFAULT_CONFIG }
          }
        } else {
          return initResult
        }
      }
      return result
    }
  } catch (error) {
    return {
      success: false,
      error: `读取配置文件失败: ${error.message}`
    }
  }
}

/**
 * 保存CCR Desktop配置文件
 * @param {object} configData - 配置数据
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function saveCCRDesktopConfig(configData) {
  try {
    await ensureConfigDir()
    const configPath = getCCRDesktopConfigPath()

    // 更新最后修改时间
    const configToSave = {
      ...configData,
      lastModified: new Date().toISOString()
    }

    const result = await writeJsonFile(configPath, configToSave)
    return result
  } catch (error) {
    return {
      success: false,
      error: `保存配置文件失败: ${error.message}`
    }
  }
}

/**
 * 更新CCR Desktop配置的指定部分
 * @param {string} section - 配置部分名称
 * @param {object} sectionData - 部分配置数据
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateCCRDesktopConfigSection(section, sectionData) {
  try {
    // 读取现有配置
    const readResult = await readCCRDesktopConfig()
    if (!readResult.success) {
      return readResult
    }

    const config = readResult.data

    // 更新指定部分
    config[section] = {
      ...config[section],
      ...sectionData
    }

    // 保存更新后的配置
    return await saveCCRDesktopConfig(config)
  } catch (error) {
    return {
      success: false,
      error: `更新配置部分失败: ${error.message}`
    }
  }
}

/**
 * 更新配置快照
 * @param {object} snapshotData - 快照数据
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateConfigSnapshot(snapshotData) {
  return await updateCCRDesktopConfigSection('backupSnapshot', snapshotData)
}
