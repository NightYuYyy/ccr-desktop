/**
 * 渲染进程JSON处理工具函数
 * 封装JSON验证、格式化和错误处理逻辑，提供一致的错误信息格式
 */

/**
 * 安全解析JSON字符串
 * @param {string} jsonString - JSON字符串
 * @returns {{success: boolean, data?: any, error?: string}} 解析结果
 */
export function safeParseJson(jsonString) {
  try {
    if (typeof jsonString !== 'string') {
      return {
        success: false,
        error: '输入必须是字符串'
      }
    }

    if (!jsonString.trim()) {
      return {
        success: false,
        error: 'JSON字符串不能为空'
      }
    }

    const data = JSON.parse(jsonString)
    return {
      success: true,
      data
    }
  } catch (error) {
    return {
      success: false,
      error: `JSON格式错误: ${error.message}`
    }
  }
}

/**
 * 安全格式化JSON对象
 * @param {any} data - 要格式化的数据
 * @param {number} space - 缩进空格数，默认为2
 * @returns {{success: boolean, formatted?: string, error?: string}} 格式化结果
 */
export function safeStringifyJson(data, space = 2) {
  try {
    const formatted = JSON.stringify(data, null, space)
    return {
      success: true,
      formatted
    }
  } catch (error) {
    return {
      success: false,
      error: `JSON序列化失败: ${error.message}`
    }
  }
}

/**
 * 深度克隆对象（使用JSON序列化方式）
 * @param {any} obj - 要克隆的对象
 * @returns {{success: boolean, cloned?: any, error?: string}} 克隆结果
 */
export function deepCloneJson(obj) {
  try {
    if (obj === null || obj === undefined) {
      return {
        success: true,
        cloned: obj
      }
    }

    const jsonString = JSON.stringify(obj)
    const cloned = JSON.parse(jsonString)

    return {
      success: true,
      cloned
    }
  } catch (error) {
    return {
      success: false,
      error: `对象克隆失败: ${error.message}`
    }
  }
}

/**
 * 验证JSON格式
 * @param {string} jsonString - JSON字符串
 * @returns {{isValid: boolean, error?: string}} 验证结果
 */
export function validateJsonFormat(jsonString) {
  try {
    if (typeof jsonString !== 'string') {
      return {
        isValid: false,
        error: '输入必须是字符串'
      }
    }

    if (!jsonString.trim()) {
      return {
        isValid: false,
        error: 'JSON字符串不能为空'
      }
    }

    JSON.parse(jsonString)
    return {
      isValid: true
    }
  } catch (error) {
    return {
      isValid: false,
      error: `JSON格式错误: ${error.message}`
    }
  }
}
