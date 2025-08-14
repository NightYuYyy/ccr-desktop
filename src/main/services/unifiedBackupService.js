import { backupDataToWebdav } from './webdavService.js'
import {
  readCCRDesktopConfig,
  saveCCRDesktopConfig,
  updateConfigSnapshot
} from './ccrDesktopConfigService.js'
import { createConfigSnapshot } from './configSnapshotService.js'
import path from 'path'
import fs from 'fs/promises'

/**
 * 统一备份服务
 * 支持本地和WebDAV备份我们的统一配置文件
 */

/**
 * 更新配置快照并备份
 * @param {object} [options] - 备份选项
 * @param {boolean} [options.useWebdav=false] - 是否使用WebDAV备份
 * @param {boolean} [options.updateSnapshot=true] - 是否更新快照
 * @returns {Promise<{success: boolean, backupPath?: string, error?: string}>} 操作结果
 */
export async function backupUnifiedConfig(options = {}) {
  const { useWebdav = false, updateSnapshot = true } = options

  try {
    // 如果需要更新快照，先创建并保存快照
    if (updateSnapshot) {
      const snapshotResult = await createConfigSnapshot()
      if (snapshotResult.success) {
        // 更新我们的配置文件中的快照
        const updateResult = await updateConfigSnapshot(snapshotResult.data)
        if (!updateResult.success) {
          console.warn('[BackupService] 更新配置快照失败:', updateResult.error)
        }
      } else {
        console.warn('[BackupService] 创建配置快照失败:', snapshotResult.error)
      }
    }

    // 读取我们的统一配置文件
    const configResult = await readCCRDesktopConfig()
    if (!configResult.success) {
      return {
        success: false,
        error: `读取配置失败: ${configResult.error}`
      }
    }

    if (useWebdav) {
      // 使用WebDAV备份我们的统一配置文件
      return await backupToWebdav(configResult.data)
    } else {
      // 本地备份我们的统一配置文件
      return await backupLocally(configResult.data)
    }
  } catch (error) {
    return {
      success: false,
      error: `备份过程中发生错误: ${error.message}`
    }
  }
}

/**
 * 本地备份我们的统一配置文件
 * @param {object} configData - 配置数据
 * @returns {Promise<{success: boolean, backupPath?: string, error?: string}>}
 */
async function backupLocally(configData) {
  try {
    // 获取备份目录路径
    const configDir = path.join(process.env.HOME || process.env.USERPROFILE, '.ccr-desktop')
    const backupDir = path.join(configDir, 'backups')

    // 确保备份目录存在
    await fs.mkdir(backupDir, { recursive: true })

    // 生成备份文件名 (包含时间戳)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFileName = `ccr-desktop-backup-${timestamp}.json`
    const backupPath = path.join(backupDir, backupFileName)

    // 写入备份文件
    const backupResult = await saveJsonFile(backupPath, configData)
    if (!backupResult.success) {
      return {
        success: false,
        error: `创建备份失败: ${backupResult.error}`
      }
    }

    return {
      success: true,
      backupPath,
      message: `备份成功创建: ${backupPath}`
    }
  } catch (error) {
    return {
      success: false,
      error: `本地备份失败: ${error.message}`
    }
  }
}

/**
 * WebDAV备份我们的统一配置文件
 * @param {object} configData - 配置数据
 * @returns {Promise<{success: boolean, backupPath?: string, error?: string}>}
 */
async function backupToWebdav(configData) {
  try {
    // 使用现有的WebDAV服务进行备份
    // 首先确保我们的配置文件是最新的
    const saveResult = await saveCCRDesktopConfig(configData)
    if (!saveResult.success) {
      return {
        success: false,
        error: `保存配置文件失败: ${saveResult.error}`
      }
    }

    // 调用WebDAV备份服务
    const webdavResult = await backupDataToWebdav()
    return webdavResult
  } catch (error) {
    return {
      success: false,
      error: `WebDAV备份失败: ${error.message}`
    }
  }
}

/**
 * 保存JSON文件的辅助函数
 * @param {string} filePath - 文件路径
 * @param {object} data - 数据
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function saveJsonFile(filePath, data) {
  try {
    const jsonString = JSON.stringify(data, null, 2)
    await fs.writeFile(filePath, jsonString, 'utf-8')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: `写入文件失败: ${error.message}`
    }
  }
}
