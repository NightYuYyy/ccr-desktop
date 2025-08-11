import { createClient } from 'webdav'
import { getClaudeCodeRouterSettingsPath } from '../utils/pathUtils.js'
import fs from 'fs/promises'

/**
 * WebDAV备份配置
 */
let webdavConfig = {
  server: '',
  username: '',
  password: '',
  remotePath: '/ccr-backups'
}

/**
 * 设置WebDAV配置
 * @param {object} config - WebDAV配置
 * @param {string} config.server - WebDAV服务器地址
 * @param {string} config.username - 用户名
 * @param {string} config.password - 密码
 * @param {string} [config.remotePath] - 远程路径，默认为'/ccr-backups'
 */
export function setWebdavConfig(config) {
  webdavConfig = {
    ...webdavConfig,
    ...config
  }
}

/**
 * 获取WebDAV配置
 * @returns {object} 当前WebDAV配置
 */
export function getWebdavConfig() {
  return { ...webdavConfig }
}

/**
 * 创建WebDAV客户端
 * @returns {object} WebDAV客户端实例
 */
function createWebdavClient() {
  if (!webdavConfig.server || !webdavConfig.username || !webdavConfig.password) {
    throw new Error('WebDAV配置不完整，请提供服务器地址、用户名和密码')
  }

  return createClient(webdavConfig.server, {
    username: webdavConfig.username,
    password: webdavConfig.password
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

    // 确保远程备份目录存在
    try {
      await client.getDirectoryContents(webdavConfig.remotePath)
    } catch (error) {
      // 如果目录不存在，创建它
      if (error.status === 404) {
        await client.createDirectory(webdavConfig.remotePath, { recursive: true })
      } else {
        throw error
      }
    }

    // 获取本地配置文件路径
    const configPath = getClaudeCodeRouterSettingsPath()

    // 生成备份文件名 (包含时间戳)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFileName = `settings-backup-${timestamp}.json`
    const remoteBackupPath = `${webdavConfig.remotePath}/${backupFileName}`

    // 读取本地配置文件内容
    const configContent = await fs.readFile(configPath, 'utf-8')

    // 上传到WebDAV服务器
    await client.putFileContents(remoteBackupPath, configContent, { overwrite: true })

    return {
      success: true,
      backupPath: `${webdavConfig.server}${remoteBackupPath}`,
      message: `备份成功上传到: ${webdavConfig.server}${remoteBackupPath}`
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
    const configPath = getClaudeCodeRouterSettingsPath()

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

    // 获取备份目录内容
    const contents = await client.getDirectoryContents(webdavConfig.remotePath)

    // 过滤出备份文件（以settings-backup-开头的json文件）
    const backupFiles = contents
      .filter(
        (item) =>
          item.type === 'file' &&
          item.basename.startsWith('settings-backup-') &&
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
