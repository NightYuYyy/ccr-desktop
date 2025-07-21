import { readFile, access, constants } from 'fs/promises'
import { existsSync } from 'fs'

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