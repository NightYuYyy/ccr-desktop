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
 * 获取直连配置文件路径 (config.json)
 * @returns {string} 直连配置文件的绝对路径
 */
export function getDirectConfigPath() {
  return join(getClaudeConfigDir(), 'config.json')
}

/**
 * 获取 CCR Desktop 配置目录路径
 * @returns {string} CCR Desktop配置目录的绝对路径
 */
export function getCCRDesktopConfigDir() {
  return join(getUserHomeDir(), '.ccr-desktop')
}

/**
 * 获取 CCR Desktop 设置文件路径
 * @returns {string} CCR Desktop设置文件的绝对路径
 */
export function getCCRDesktopConfigPath() {
  return join(getCCRDesktopConfigDir(), 'config.json')
}

/**
 * 获取 CCR Desktop WebDAV 配置文件路径
 * @returns {string} WebDAV配置文件的绝对路径
 */
export function getCCRDesktopWebdavConfigPath() {
  return join(getCCRDesktopConfigDir(), 'webdav-config.json')
}

/**
 * 获取 CCR Desktop 备份目录路径
 * @returns {string} 备份目录的绝对路径
 */
export function getCCRDesktopBackupsDir() {
  return join(getCCRDesktopConfigDir(), 'backups')
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
