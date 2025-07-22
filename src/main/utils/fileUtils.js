import { readFile, writeFile, access, constants, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { dirname } from 'path'

/**
 * 检查文件是否存在
 * @param {string} filePath - 文件路径
 * @returns {Promise&lt;boolean&gt;} 文件是否存在
 */
export async function fileExists(filePath) {
  try {
    await access(filePath, constants.F_OK)
    return true
  } catch {
    return false
  }
}

/**
 * 检查文件是否可读
 * @param {string} filePath - 文件路径
 * @returns {Promise&lt;boolean&gt;} 文件是否可读
 */
export async function isFileReadable(filePath) {
  try {
    await access(filePath, constants.R_OK)
    return true
  } catch {
    return false
  }
}

/**
 * 安全读取JSON文件
 * @param {string} filePath - JSON文件路径
 * @returns {Promise&lt;{success: boolean, data?: any, error?: string}&gt;} 读取结果
 */
export async function readJsonFile(filePath) {
  try {
    // 检查文件是否存在
    if (!existsSync(filePath)) {
      return {
        success: false,
        error: `配置文件不存在: ${filePath}`
      }
    }

    // 检查文件是否可读
    if (!(await isFileReadable(filePath))) {
      return {
        success: false,
        error: `没有读取配置文件的权限: ${filePath}`
      }
    }

    // 读取文件内容
    const content = await readFile(filePath, 'utf-8')

    // 解析JSON
    const data = JSON.parse(content)

    return {
      success: true,
      data
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {
        success: false,
        error: `配置文件格式错误，请检查JSON语法: ${error.message}`
      }
    }

    return {
      success: false,
      error: `读取配置文件失败: ${error.message}`
    }
  }
}

/**
 * 同步检查文件是否存在（用于快速检查）
 * @param {string} filePath - 文件路径
 * @returns {boolean} 文件是否存在
 */
export function fileExistsSync(filePath) {
  return existsSync(filePath)
}

/**
 * 安全写入JSON文件
 * @param {string} filePath - JSON文件路径
 * @param {any} data - 要写入的数据
 * @returns {Promise<{success: boolean, error?: string}>} 写入结果
 */
export async function writeJsonFile(filePath, data) {
  try {
    // 确保目录存在
    const dir = dirname(filePath)
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true })
    }

    // 将数据转换为格式化的JSON字符串
    const content = JSON.stringify(data, null, 2)

    // 写入文件
    await writeFile(filePath, content, 'utf-8')

    return {
      success: true
    }
  } catch (error) {
    return {
      success: false,
      error: `写入配置文件失败: ${error.message}`
    }
  }
}
