import {
  getClaudeCodeRouterSettingsPath,
  getClaudeCodeRouterConfigDir,
  getClaudeSettingsPath,
  getClaudeConfigDir,
  getDirectConfigPath
} from '../utils/pathUtils.js'

/**
 * 统一配置管理服务
 * 集中处理所有配置文件路径相关的操作，避免重复代码
 */
export class ConfigManager {
  // 缓存路径以避免重复计算
  static _pathCache = new Map()

  /**
   * 获取 Claude Code Router 配置路径信息
   * @returns {{configPath: string, configDir: string}}
   */
  static getCCRPaths() {
    const cacheKey = 'ccr-paths'
    if (this._pathCache.has(cacheKey)) {
      return this._pathCache.get(cacheKey)
    }

    const paths = {
      configPath: getClaudeCodeRouterSettingsPath(),
      configDir: getClaudeCodeRouterConfigDir()
    }

    this._pathCache.set(cacheKey, paths)
    return paths
  }

  /**
   * 获取 Claude 配置路径信息
   * @returns {string}
   */
  static getClaudeSettingsPath() {
    const cacheKey = 'claude-settings-path'
    if (this._pathCache.has(cacheKey)) {
      return this._pathCache.get(cacheKey)
    }

    const path = getClaudeSettingsPath()
    this._pathCache.set(cacheKey, path)
    return path
  }

  /**
   * 获取 Claude 配置目录
   * @returns {string}
   */
  static getClaudeConfigDir() {
    const cacheKey = 'claude-config-dir'
    if (this._pathCache.has(cacheKey)) {
      return this._pathCache.get(cacheKey)
    }

    const dir = getClaudeConfigDir()
    this._pathCache.set(cacheKey, dir)
    return dir
  }

  /**
   * 获取直连配置路径
   * @returns {string}
   */
  static getDirectConfigPath() {
    const cacheKey = 'direct-config-path'
    if (this._pathCache.has(cacheKey)) {
      return this._pathCache.get(cacheKey)
    }

    const path = getDirectConfigPath()
    this._pathCache.set(cacheKey, path)
    return path
  }

  /**
   * 清除路径缓存
   */
  static clearCache() {
    this._pathCache.clear()
  }
}
