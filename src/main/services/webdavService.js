import { createClient } from 'webdav'
import { getCCRDesktopConfigPath, getCCRDesktopWebdavConfigPath } from '../utils/pathUtils.js'
import { readJsonFile, writeJsonFile } from '../utils/fileUtils.js'
import { ConfigManager } from './configManager.js'
import fs from 'fs/promises'
import path from 'path'

/**
 * WebDAV备份配置（内存中的缓存）
 */
let webdavConfig = {
  server: '',
  username: '',
  password: '',
  remotePath: '/ccr-backups'
}

/**
 * 获取WebDAV配置文件路径
 * @returns {string} WebDAV配置文件路径
 */
function getWebdavConfigPath() {
  return getCCRDesktopWebdavConfigPath()
}

/**
 * 获取旧的WebDAV配置文件路径（用于迁移）
 * @returns {string} 旧的WebDAV配置文件路径
 */
function getOldWebdavConfigPath() {
  const configDir = ConfigManager.getCCRPaths().configDir
  return path.join(configDir, 'webdav-config.json')
}

/**
 * 迁移WebDAV配置从旧位置到新位置
 * @returns {Promise<boolean>} 是否迁移成功
 */
async function migrateWebdavConfig() {
  try {
    const oldPath = getOldWebdavConfigPath()
    const newPath = getWebdavConfigPath()

    // 检查旧配置文件是否存在
    const oldConfigExists = await fs
      .access(oldPath)
      .then(() => true)
      .catch(() => false)

    if (oldConfigExists) {
      console.log('[WebDAV] 发现旧配置文件，开始迁移:', oldPath)

      // 读取旧配置
      const result = await readJsonFile(oldPath)
      if (result.success && result.data) {
        // 写入新位置
        const writeResult = await writeJsonFile(newPath, result.data)
        if (writeResult.success) {
          console.log('[WebDAV] 配置迁移成功:', newPath)

          // 删除旧配置文件
          try {
            await fs.unlink(oldPath)
            console.log('[WebDAV] 旧配置文件已删除:', oldPath)
          } catch (error) {
            console.warn('[WebDAV] 删除旧配置文件失败:', error.message)
          }

          return true
        }
      }
    }

    return false
  } catch (error) {
    console.error('[WebDAV] 配置迁移失败:', error.message)
    return false
  }
}

/**
 * 从文件加载WebDAV配置
 * @returns {Promise<object>} WebDAV配置对象
 */
async function loadWebdavConfigFromFile() {
  try {
    // 首先尝试迁移旧配置
    await migrateWebdavConfig()

    const configPath = getWebdavConfigPath()
    const result = await readJsonFile(configPath)

    if (result.success && result.data) {
      return result.data
    }
  } catch (error) {
    console.log('[WebDAV] 加载配置文件失败，使用默认配置:', error.message)
  }

  // 返回默认配置
  return {
    server: '',
    username: '',
    password: '',
    remotePath: '/ccr-backups'
  }
}

/**
 * 保存WebDAV配置到文件
 * @param {object} config WebDAV配置对象
 * @returns {Promise<boolean>} 是否保存成功
 */
async function saveWebdavConfigToFile(config) {
  try {
    const configPath = getWebdavConfigPath()
    const result = await writeJsonFile(configPath, config)
    return result.success
  } catch (error) {
    console.error('[WebDAV] 保存配置文件失败:', error.message)
    return false
  }
}

// 应用启动时自动加载配置
loadWebdavConfigFromFile()
  .then((config) => {
    webdavConfig = config
    console.log('[WebDAV] 配置已加载:', getWebdavConfigPath())
  })
  .catch((error) => {
    console.warn('[WebDAV] 加载配置失败，使用默认配置:', error.message)
  })

/**
 * 设置WebDAV配置
 * @param {object} config - WebDAV配置
 * @param {string} config.server - WebDAV服务器地址
 * @param {string} config.username - 用户名
 * @param {string} config.password - 密码
 * @param {string} [config.remotePath] - 远程路径，默认为'/ccr-backups'
 * @returns {Promise<boolean>} 是否设置成功
 */
export async function setWebdavConfig(config) {
  // 更新内存中的配置
  webdavConfig = {
    ...webdavConfig,
    ...config
  }

  // 保存到配置文件
  const saved = await saveWebdavConfigToFile(webdavConfig)
  if (saved) {
    console.log('[WebDAV] 配置已保存到:', getWebdavConfigPath())
  } else {
    console.warn('[WebDAV] 配置保存失败')
  }

  return saved
}

/**
 * 获取WebDAV配置
 * @returns {Promise<object>} 当前WebDAV配置
 */
export async function getWebdavConfig() {
  // 确保配置是最新的（从文件重新加载）
  try {
    const fileConfig = await loadWebdavConfigFromFile()
    webdavConfig = fileConfig
  } catch (error) {
    console.warn('[WebDAV] 重新加载配置失败:', error.message)
  }

  return {
    ...webdavConfig,
    // 为安全起见，返回时不暴露真实密码，只显示掩码
    password: webdavConfig.password ? '••••••••' : ''
  }
}

/**
 * 获取WebDAV配置（包含真实密码，仅供内部使用）
 * @returns {object} 当前WebDAV配置（包含真实密码）
 */
export function getWebdavConfigWithPassword() {
  return { ...webdavConfig }
}

/**
 * 创建WebDAV客户端
 * @returns {object} WebDAV客户端实例
 */
function createWebdavClient() {
  const config = getWebdavConfigWithPassword() // 使用包含真实密码的配置

  if (!config.server || !config.username || !config.password) {
    throw new Error('WebDAV配置不完整，请提供服务器地址、用户名和密码')
  }

  return createClient(config.server, {
    username: config.username,
    password: config.password
  })
}

/**
 * 测试WebDAV连接
 * @returns {Promise<{success: boolean, error?: string}>} 连接测试结果
 */
export async function testWebdavConnection() {
  try {
    const client = createWebdavClient()
    // 尝试获取目录信息来测试连接
    await client.getDirectoryContents('/')
    return {
      success: true
    }
  } catch (error) {
    return {
      success: false,
      error: `连接失败: ${error.message}`
    }
  }
}

/**
 * 通过WebDAV备份数据
 * @returns {Promise<{success: boolean, backupPath?: string, error?: string}>} 备份结果
 */
export async function backupDataToWebdav() {
  try {
    const client = createWebdavClient()

    const config = getWebdavConfigWithPassword() // 获取真实配置

    // 确保远程备份目录存在
    try {
      await client.getDirectoryContents(config.remotePath)
    } catch (error) {
      // 如果目录不存在，创建它
      if (error.status === 404) {
        await client.createDirectory(config.remotePath, { recursive: true })
      } else {
        throw error
      }
    }

    // 获取本地配置文件路径
    const configPath = getCCRDesktopConfigPath()

    // 生成备份文件名 (包含时间戳)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFileName = `ccr-desktop-backup-${timestamp}.json`
    const remoteBackupPath = `${config.remotePath}/${backupFileName}`

    // 读取本地配置文件内容
    const configContent = await fs.readFile(configPath, 'utf-8')

    // 上传到WebDAV服务器
    await client.putFileContents(remoteBackupPath, configContent, { overwrite: true })

    return {
      success: true,
      backupPath: `${config.server}${remoteBackupPath}`,
      message: `备份成功上传到: ${config.server}${remoteBackupPath}`
    }
  } catch (error) {
    return {
      success: false,
      error: `WebDAV备份失败: ${error.message}`
    }
  }
}

/**
 * 从WebDAV恢复数据
 * @param {string} remoteFilePath - 远程文件路径
 * @returns {Promise<{success: boolean, error?: string}>} 恢复结果
 */
export async function restoreDataFromWebdav(remoteFilePath) {
  try {
    const client = createWebdavClient()

    // 获取本地配置文件路径
    const configPath = getCCRDesktopConfigPath()

    // 从WebDAV下载文件内容
    const fileContent = await client.getFileContents(remoteFilePath, { format: 'text' })

    // 写入本地配置文件
    await fs.writeFile(configPath, fileContent, 'utf-8')

    return {
      success: true,
      message: '数据恢复成功'
    }
  } catch (error) {
    return {
      success: false,
      error: `从WebDAV恢复数据失败: ${error.message}`
    }
  }
}

/**
 * 列出WebDAV备份文件
 * @returns {Promise<{success: boolean, files?: Array, error?: string}>} 文件列表
 */
export async function listWebdavBackups() {
  try {
    const client = createWebdavClient()
    const config = getWebdavConfigWithPassword() // 获取真实配置

    // 获取备份目录内容
    const contents = await client.getDirectoryContents(config.remotePath)

    // 过滤出备份文件（以settings-backup-开头的json文件）
    const backupFiles = contents
      .filter(
        (item) =>
          item.type === 'file' &&
          item.basename.startsWith('ccr-desktop-backup-') &&
          item.basename.endsWith('.json')
      )
      .map((item) => ({
        name: item.basename,
        path: item.filename,
        size: item.size,
        modified: item.lastmod
      }))
      .sort((a, b) => new Date(b.modified) - new Date(a.modified)) // 按修改时间倒序排列

    return {
      success: true,
      files: backupFiles
    }
  } catch (error) {
    return {
      success: false,
      error: `获取备份文件列表失败: ${error.message}`
    }
  }
}
