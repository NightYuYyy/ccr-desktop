import { homedir } from 'os'
import { join } from 'path'

/**
 * 获取用户主目录路径
 * @returns {string} 用户主目录的绝对路径
 */
export function getUserHomeDir() {
  return homedir()
}

/**
 * 获取 Claude Code Router 配置目录路径
 * @returns {string} 配置目录的绝对路径
 */
export function getClaudeCodeRouterConfigDir() {
  return join(getUserHomeDir(), '.claude-code-router')
}

/**
 * 获取 Claude Code Router 设置文件路径
 * @returns {string} 设置文件的绝对路径
 */
export function getClaudeCodeRouterSettingsPath() {
  return join(getClaudeCodeRouterConfigDir(), 'config.json')
}

/**
 * 获取 Claude 配置目录路径
 * @returns {string} Claude配置目录的绝对路径
 */
export function getClaudeConfigDir() {
  return join(getUserHomeDir(), '.claude')
}

/**
 * 获取 Claude 设置文件路径
 * @returns {string} Claude设置文件的绝对路径
 */
export function getClaudeSettingsPath() {
  return join(getClaudeConfigDir(), 'settings.json')
}

/**
 * 规范化文件路径（处理相对路径和特殊字符）
 * @param {string} filePath - 原始文件路径
 * @returns {string} 规范化后的绝对路径
 */
export function normalizePath(filePath) {
  if (filePath.startsWith('~')) {
    return join(getUserHomeDir(), filePath.slice(1))
  }
  return filePath
}
