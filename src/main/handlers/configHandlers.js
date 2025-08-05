import { ipcMain, shell } from 'electron'
import { spawn } from 'child_process'
import {
  readClaudeCodeRouterSettings,
  getConfigPaths,
  saveClaudeCodeRouterSettings,
  addProvider,
  updateProvider,
  deleteProvider,
  updateDefaultModel,
  updateRouterModel,
  updateLongContextThreshold
} from '../services/configService.js'
import { readJsonFile, writeJsonFile } from '../utils/fileUtils.js'
import { writeFile } from 'fs/promises'
import {
  getUserHomeDir,
  getClaudeSettingsPath,
  getClaudeConfigDir,
  getDirectConfigPath
} from '../utils/pathUtils.js'

/**
 * 注册配置相关的IPC处理器
 */
export function registerConfigHandlers() {
  // 读取设置文件的处理器
  ipcMain.handle('read-settings', async () => {
    try {
      console.log('[ConfigHandler] 开始读取 Claude Code Router 配置文件')

      const result = await readClaudeCodeRouterSettings()

      if (result.success) {
        console.log('[ConfigHandler] 配置文件读取成功:', result.configPath)
        return {
          success: true,
          data: result.data,
          configPath: result.configPath
        }
      } else {
        console.warn('[ConfigHandler] 配置文件读取失败:', result.error)
        return {
          success: false,
          error: result.error,
          configPath: result.configPath,
          suggestion: result.suggestion
        }
      }
    } catch (error) {
      console.error('[ConfigHandler] 处理配置读取请求时发生错误:', error)
      return {
        success: false,
        error: `处理请求时发生错误: ${error.message}`
      }
    }
  })

  // 获取配置文件路径的处理器
  ipcMain.handle('get-config-paths', async () => {
    try {
      const paths = getConfigPaths()
      console.log('[ConfigHandler] 返回配置路径信息:', paths)
      return {
        success: true,
        data: paths
      }
    } catch (error) {
      console.error('[ConfigHandler] 获取配置路径失败:', error)
      return {
        success: false,
        error: `获取配置路径失败: ${error.message}`
      }
    }
  })

  // 打开配置文件夹的处理器
  ipcMain.handle('open-config-folder', async () => {
    try {
      const paths = getConfigPaths()
      console.log('[ConfigHandler] 尝试打开配置文件夹:', paths.configDir)

      await shell.openPath(paths.configDir)

      return {
        success: true,
        message: '配置文件夹已打开'
      }
    } catch (error) {
      console.error('[ConfigHandler] 打开配置文件夹失败:', error)
      return {
        success: false,
        error: `打开配置文件夹失败: ${error.message}`
      }
    }
  })

  // 打开Claude配置文件夹的处理器
  ipcMain.handle('open-claude-config-folder', async () => {
    try {
      const claudeConfigDir = getClaudeConfigDir()
      console.log('[ConfigHandler] 尝试打开Claude配置文件夹:', claudeConfigDir)

      await shell.openPath(claudeConfigDir)

      return {
        success: true,
        message: 'Claude配置文件夹已打开'
      }
    } catch (error) {
      console.error('[ConfigHandler] 打开Claude配置文件夹失败:', error)
      return {
        success: false,
        error: `打开Claude配置文件夹失败: ${error.message}`
      }
    }
  })

  // 保存配置文件的处理器
  ipcMain.handle('save-settings', async (event, configData) => {
    try {
      console.log('[ConfigHandler] 开始保存配置文件')

      const result = await saveClaudeCodeRouterSettings(configData)

      if (result.success) {
        console.log('[ConfigHandler] 配置文件保存成功:', result.configPath)

        // 配置保存成功后刷新悬浮窗
        setImmediate(() => {
          ipcMain.emit('refresh-floating-window')
        })

        return {
          success: true,
          message: '配置已保存',
          configPath: result.configPath
        }
      } else {
        console.warn('[ConfigHandler] 配置文件保存失败:', result.error)
        return {
          success: false,
          error: result.error,
          configPath: result.configPath
        }
      }
    } catch (error) {
      console.error('[ConfigHandler] 处理配置保存请求时发生错误:', error)
      return {
        success: false,
        error: `处理请求时发生错误: ${error.message}`
      }
    }
  })

  // 执行命令的处理器（支持实时输出）
  ipcMain.handle('exec-command', async (event, command) => {
    return new Promise((resolve) => {
      console.log('[ConfigHandler] 执行命令:', command)

      // 分割命令和参数
      const cmdParts = command.split(' ')
      const cmd = cmdParts[0]
      const args = cmdParts.slice(1)

      let stdout = ''
      let stderr = ''
      let hasOutput = false

      const child = spawn(cmd, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true
      })

      // 监听标准输出
      child.stdout.on('data', (data) => {
        const output = data.toString()
        stdout += output
        hasOutput = true
        console.log('[ConfigHandler] stdout:', output.trim())

        // 发送实时输出到前端
        event.sender.send('command-output', {
          type: 'stdout',
          data: output
        })
      })

      // 监听错误输出
      child.stderr.on('data', (data) => {
        const output = data.toString()
        stderr += output
        hasOutput = true
        console.log('[ConfigHandler] stderr:', output.trim())

        // 发送实时输出到前端
        event.sender.send('command-output', {
          type: 'stderr',
          data: output
        })
      })

      // 监听进程结束
      child.on('close', (code) => {
        if (serviceCheckTimeout) {
          clearTimeout(serviceCheckTimeout)
        }
        console.log('[ConfigHandler] 命令执行完成，退出码:', code)

        resolve({
          success: code === 0,
          exitCode: code,
          stdout: stdout,
          stderr: stderr,
          hasOutput: hasOutput,
          error: code !== 0 ? `进程退出码: ${code}` : null
        })
      })

      // 监听错误事件
      child.on('error', (error) => {
        if (serviceCheckTimeout) {
          clearTimeout(serviceCheckTimeout)
        }
        console.error('[ConfigHandler] 命令执行失败:', error)
        resolve({
          success: false,
          error: error.message,
          stdout: stdout,
          stderr: stderr,
          hasOutput: hasOutput
        })
      })

      // 对于服务类命令，等待3秒后如果进程仍在运行且有输出，则认为启动成功
      let serviceCheckTimeout = setTimeout(() => {
        if (child.exitCode === null && !child.killed) {
          // 进程仍在运行，认为服务启动成功
          console.log('[ConfigHandler] 服务启动成功，进程持续运行中')
          resolve({
            success: true,
            running: true,
            stdout: stdout,
            stderr: stderr,
            hasOutput: hasOutput,
            message: '服务已启动并在后台运行'
          })
        }
      }, 3000)
    })
  })

  // 添加Provider的处理器
  ipcMain.handle('add-provider', async (event, providerData) => {
    try {
      console.log('[ConfigHandler] 添加Provider:', providerData.name)

      const result = await addProvider(providerData)

      if (result.success) {
        console.log('[ConfigHandler] Provider添加成功')
        return {
          success: true,
          message: `Provider "${providerData.name}" 添加成功`
        }
      } else {
        console.warn('[ConfigHandler] Provider添加失败:', result.error)
        return result
      }
    } catch (error) {
      console.error('[ConfigHandler] 处理添加Provider请求时发生错误:', error)
      return {
        success: false,
        error: `处理请求时发生错误: ${error.message}`
      }
    }
  })

  // 更新Provider的处理器
  ipcMain.handle('update-provider', async (event, providerName, updatedData) => {
    try {
      console.log('[ConfigHandler] 更新Provider:', providerName)

      const result = await updateProvider(providerName, updatedData)

      if (result.success) {
        console.log('[ConfigHandler] Provider更新成功')
        return {
          success: true,
          message: `Provider "${providerName}" 更新成功`
        }
      } else {
        console.warn('[ConfigHandler] Provider更新失败:', result.error)
        return result
      }
    } catch (error) {
      console.error('[ConfigHandler] 处理更新Provider请求时发生错误:', error)
      return {
        success: false,
        error: `处理请求时发生错误: ${error.message}`
      }
    }
  })

  // 删除Provider的处理器
  ipcMain.handle('delete-provider', async (event, providerName) => {
    try {
      console.log('[ConfigHandler] 删除Provider:', providerName)

      const result = await deleteProvider(providerName)

      if (result.success) {
        console.log('[ConfigHandler] Provider删除成功')
        return {
          success: true,
          message: `Provider "${providerName}" 删除成功`
        }
      } else {
        console.warn('[ConfigHandler] Provider删除失败:', result.error)
        return result
      }
    } catch (error) {
      console.error('[ConfigHandler] 处理删除Provider请求时发生错误:', error)
      return {
        success: false,
        error: `处理请求时发生错误: ${error.message}`
      }
    }
  })

  // 更新默认模型的处理器
  ipcMain.handle('update-default-model', async (event, defaultModel) => {
    try {
      console.log('[ConfigHandler] 更新默认模型:', defaultModel)

      const result = await updateDefaultModel(defaultModel)

      if (result.success) {
        console.log('[ConfigHandler] 默认模型更新成功')

        // 默认模型更新成功后刷新悬浮窗
        setImmediate(() => {
          ipcMain.emit('refresh-floating-window')
        })

        return {
          success: true,
          message: '默认模型更新成功'
        }
      } else {
        console.warn('[ConfigHandler] 默认模型更新失败:', result.error)
        return result
      }
    } catch (error) {
      console.error('[ConfigHandler] 处理更新默认模型请求时发生错误:', error)
      return {
        success: false,
        error: `处理请求时发生错误: ${error.message}`
      }
    }
  })

  // 更新路由器模型的处理器
  ipcMain.handle('update-router-model', async (event, modelType, modelValue) => {
    try {
      console.log(`[ConfigHandler] 更新${modelType}模型:`, modelValue)

      const result = await updateRouterModel(modelType, modelValue)

      if (result.success) {
        console.log(`[ConfigHandler] ${modelType}模型更新成功`)

        // 模型更新成功后刷新悬浮窗
        setImmediate(() => {
          ipcMain.emit('refresh-floating-window')
        })

        return {
          success: true,
          message: `${modelType}模型更新成功`
        }
      } else {
        console.warn(`[ConfigHandler] ${modelType}模型更新失败:`, result.error)
        return result
      }
    } catch (error) {
      console.error(`[ConfigHandler] 处理更新${modelType}模型请求时发生错误:`, error)
      return {
        success: false,
        error: `处理请求时发生错误: ${error.message}`
      }
    }
  })

  // 更新长文本阈值的处理器
  ipcMain.handle('update-long-context-threshold', async (event, threshold) => {
    try {
      console.log('[ConfigHandler] 更新长文本阈值:', threshold)

      const result = await updateLongContextThreshold(threshold)

      if (result.success) {
        console.log('[ConfigHandler] 长文本阈值更新成功')

        // 阈值更新成功后刷新悬浮窗
        setImmediate(() => {
          ipcMain.emit('refresh-floating-window')
        })

        return {
          success: true,
          message: '长文本阈值更新成功'
        }
      } else {
        console.warn('[ConfigHandler] 长文本阈值更新失败:', result.error)
        return result
      }
    } catch (error) {
      console.error('[ConfigHandler] 处理更新长文本阈值请求时发生错误:', error)
      return {
        success: false,
        error: `处理请求时发生错误: ${error.message}`
      }
    }
  })

  // 获取用户主目录的处理器
  ipcMain.handle('get-home-dir', async () => {
    try {
      const homeDir = getUserHomeDir()
      return {
        success: true,
        data: homeDir
      }
    } catch (error) {
      console.error('[ConfigHandler] 获取用户主目录失败:', error)
      return {
        success: false,
        error: `获取用户主目录失败: ${error.message}`
      }
    }
  })

  // 获取Claude配置文件路径的处理器
  ipcMain.handle('get-claude-settings-path', async () => {
    try {
      const configPath = getClaudeSettingsPath()
      return {
        success: true,
        data: configPath
      }
    } catch (error) {
      console.error('[ConfigHandler] 获取Claude配置文件路径失败:', error)
      return {
        success: false,
        error: `获取Claude配置文件路径失败: ${error.message}`
      }
    }
  })

  // 读取文件的处理器
  ipcMain.handle('read-file', async (event, filePath) => {
    try {
      const result = await readJsonFile(filePath)
      return result
    } catch (error) {
      console.error('[ConfigHandler] 读取文件失败:', error)
      return {
        success: false,
        error: `读取文件失败: ${error.message}`
      }
    }
  })

  // 写入文件的处理器
  ipcMain.handle('write-file', async (event, filePath, content) => {
    try {
      // 如果content是字符串，尝试解析为JSON对象
      let dataToWrite = content
      if (typeof content === 'string') {
        try {
          dataToWrite = JSON.parse(content)
        } catch {
          // 如果不是有效的JSON字符串，直接写入原字符串
          try {
            await writeFile(filePath, content, 'utf-8')
            return {
              success: true
            }
          } catch (writeError) {
            return {
              success: false,
              error: `写入文件失败: ${writeError.message}`
            }
          }
        }
      }

      // 使用writeJsonFile写入JSON数据
      const result = await writeJsonFile(filePath, dataToWrite)
      return result
    } catch (error) {
      console.error('[ConfigHandler] 写入文件失败:', error)
      return {
        success: false,
        error: `写入文件失败: ${error.message}`
      }
    }
  })

  // 检测网络模式的处理器
  ipcMain.handle('detect-network-mode', async () => {
    try {
      console.log('[ConfigHandler] 开始检测网络模式')

      const configPath = getClaudeSettingsPath()
      const result = await readJsonFile(configPath)

      if (result.success && result.data && result.data.env) {
        const baseUrl = result.data.env.ANTHROPIC_BASE_URL
        console.log('[ConfigHandler] 读取到 ANTHROPIC_BASE_URL:', baseUrl)

        // CCR服务地址
        const CCR_SERVICE_URL = 'http://127.0.0.1:3456'

        // 判断是否使用CCR服务
        const isUsingCCR = baseUrl === CCR_SERVICE_URL
        console.log('[ConfigHandler] 网络模式检测结果:', isUsingCCR ? '代理' : '直连')

        return {
          success: true,
          isProxy: isUsingCCR,
          mode: isUsingCCR ? 'proxy' : 'direct',
          message: isUsingCCR ? '检测到CCR服务，使用代理模式' : '未检测到CCR服务，使用直连模式'
        }
      } else {
        console.log('[ConfigHandler] 配置文件读取失败或无env配置，默认使用直连模式')
        return {
          success: true,
          isProxy: false,
          mode: 'direct',
          message: '配置文件读取失败，默认使用直连模式'
        }
      }
    } catch (error) {
      console.error('[ConfigHandler] 检测网络模式失败:', error)
      return {
        success: false,
        error: `检测网络模式失败: ${error.message}`,
        isProxy: false,
        mode: 'direct'
      }
    }
  })

  // === 直连配置相关处理器 ===

  // 获取直连配置文件路径
  ipcMain.handle('get-direct-config-path', async () => {
    try {
      const configPath = getDirectConfigPath()
      return {
        success: true,
        data: configPath
      }
    } catch (error) {
      console.error('[ConfigHandler] 获取直连配置文件路径失败:', error)
      return {
        success: false,
        error: `获取直连配置文件路径失败: ${error.message}`
      }
    }
  })

  // 读取直连配置文件
  ipcMain.handle('read-direct-config', async () => {
    try {
      console.log('[ConfigHandler] 开始读取直连配置文件')

      const configPath = getDirectConfigPath()
      const result = await readJsonFile(configPath)

      if (result.success) {
        console.log('[ConfigHandler] 直连配置文件读取成功')
        return {
          success: true,
          data: result.data,
          configPath
        }
      } else {
        // 如果配置文件不存在，返回默认配置
        if (result.error?.includes('配置文件不存在')) {
          const defaultConfig = {
            version: '1.0',
            directConfigs: [],
            settings: {}
          }

          console.log('[ConfigHandler] 直连配置文件不存在，返回默认配置')
          return {
            success: true,
            data: defaultConfig,
            configPath,
            isDefault: true
          }
        }

        return {
          success: false,
          error: result.error,
          configPath
        }
      }
    } catch (error) {
      console.error('[ConfigHandler] 处理直连配置读取请求时发生错误:', error)
      return {
        success: false,
        error: `处理请求时发生错误: ${error.message}`
      }
    }
  })

  // 保存直连配置文件
  ipcMain.handle('save-direct-config', async (event, configData) => {
    try {
      console.log('[ConfigHandler] 开始保存直连配置文件')

      const configPath = getDirectConfigPath()
      const result = await writeJsonFile(configPath, configData)

      if (result.success) {
        console.log('[ConfigHandler] 直连配置文件保存成功:', configPath)
        return {
          success: true,
          message: '直连配置已保存',
          configPath
        }
      } else {
        console.warn('[ConfigHandler] 直连配置文件保存失败:', result.error)
        return {
          success: false,
          error: result.error,
          configPath
        }
      }
    } catch (error) {
      console.error('[ConfigHandler] 处理直连配置保存请求时发生错误:', error)
      return {
        success: false,
        error: `处理请求时发生错误: ${error.message}`
      }
    }
  })

  // 应用直连配置到Claude settings.json
  ipcMain.handle('apply-direct-config', async (event, directConfig) => {
    try {
      console.log('[ConfigHandler] 开始应用直连配置到Claude settings.json')

      const settingsPath = getClaudeSettingsPath()

      // 读取现有的settings.json
      const readResult = await readJsonFile(settingsPath)
      let settings = {}

      if (readResult.success) {
        settings = readResult.data
      }

      // 更新settings中的环境变量
      if (!settings.env) {
        settings.env = {}
      }

      settings.env.ANTHROPIC_AUTH_TOKEN = directConfig.apiKey
      settings.env.ANTHROPIC_BASE_URL = directConfig.baseUrl

      // 保存更新后的settings.json
      const writeResult = await writeJsonFile(settingsPath, settings)

      if (writeResult.success) {
        console.log('[ConfigHandler] 直连配置应用成功')

        // 直连配置应用成功后刷新悬浮窗
        setImmediate(() => {
          ipcMain.emit('refresh-floating-window')
        })

        return {
          success: true,
          message: `直连配置 "${directConfig.name}" 已应用到Claude`
        }
      } else {
        return {
          success: false,
          error: `应用配置失败: ${writeResult.error}`
        }
      }
    } catch (error) {
      console.error('[ConfigHandler] 应用直连配置时发生错误:', error)
      return {
        success: false,
        error: `应用配置时发生错误: ${error.message}`
      }
    }
  })

  // 切换网络模式处理器
  ipcMain.handle('switch-network-mode', async (event, isProxy) => {
    try {
      console.log('[ConfigHandler] 开始切换网络模式:', isProxy ? '代理模式' : '直连模式')

      const settingsPath = getClaudeSettingsPath()

      // 读取现有的settings.json
      const readResult = await readJsonFile(settingsPath)
      let settings = {}

      if (readResult.success) {
        settings = readResult.data
      }

      // 初始化env配置
      if (!settings.env) {
        settings.env = {}
      }

      if (isProxy) {
        // 切换到代理模式
        console.log('[ConfigHandler] 切换到代理模式，删除API Key，设置CCR服务地址')

        // 删除API Key (代理模式下不需要)
        delete settings.env.ANTHROPIC_AUTH_TOKEN
        // 设置CCR服务地址
        settings.env.ANTHROPIC_BASE_URL = 'http://127.0.0.1:3456'
      } else {
        // 切换到直连模式，需要从保存的直连配置中获取默认配置
        console.log('[ConfigHandler] 切换到直连模式，尝试恢复直连配置')

        try {
          // 读取保存的直连配置
          const directConfigPath = getDirectConfigPath()
          const directConfigResult = await readJsonFile(directConfigPath)

          if (directConfigResult.success && directConfigResult.data) {
            const directData = directConfigResult.data
            const configs = directData.directConfigs || []

            // 查找默认配置
            let defaultConfig = null

            // 优先使用指定的默认配置
            if (directData.settings && directData.settings.defaultConfig) {
              defaultConfig = configs.find((c) => c.name === directData.settings.defaultConfig)
            }

            // 如果没有指定默认配置，查找标记为默认的配置
            if (!defaultConfig) {
              defaultConfig = configs.find((c) => c.isDefault)
            }

            // 如果还没有，使用第一个配置
            if (!defaultConfig && configs.length > 0) {
              defaultConfig = configs[0]
            }

            if (defaultConfig) {
              console.log('[ConfigHandler] 使用直连配置:', defaultConfig.name)
              settings.env.ANTHROPIC_AUTH_TOKEN = defaultConfig.apiKey
              settings.env.ANTHROPIC_BASE_URL = defaultConfig.baseUrl
            } else {
              console.log('[ConfigHandler] 未找到直连配置，使用默认官方API')
              settings.env.ANTHROPIC_AUTH_TOKEN = ''
              settings.env.ANTHROPIC_BASE_URL = 'https://api.anthropic.com'
            }
          } else {
            console.log('[ConfigHandler] 未找到保存的直连配置，使用默认官方API')
            settings.env.ANTHROPIC_AUTH_TOKEN = ''
            settings.env.ANTHROPIC_BASE_URL = 'https://api.anthropic.com'
          }
        } catch (directError) {
          console.error('[ConfigHandler] 读取直连配置失败:', directError)
          // 使用默认配置
          settings.env.ANTHROPIC_AUTH_TOKEN = ''
          settings.env.ANTHROPIC_BASE_URL = 'https://api.anthropic.com'
        }
      }

      // 保存更新后的settings.json
      const writeResult = await writeJsonFile(settingsPath, settings)

      if (writeResult.success) {
        console.log('[ConfigHandler] 网络模式切换成功')

        // 网络模式切换成功后刷新悬浮窗
        setImmediate(() => {
          ipcMain.emit('refresh-floating-window')
        })

        return {
          success: true,
          mode: isProxy ? 'proxy' : 'direct',
          message: `已切换到${isProxy ? '代理模式' : '直连模式'}`
        }
      } else {
        return {
          success: false,
          error: `切换网络模式失败: ${writeResult.error}`
        }
      }
    } catch (error) {
      console.error('[ConfigHandler] 切换网络模式时发生错误:', error)
      return {
        success: false,
        error: `切换网络模式时发生错误: ${error.message}`
      }
    }
  })

  console.log('[ConfigHandler] 配置处理器注册完成')
}

/**
 * 注销配置相关的IPC处理器
 */
export function unregisterConfigHandlers() {
  ipcMain.removeHandler('read-settings')
  ipcMain.removeHandler('get-config-paths')
  ipcMain.removeHandler('open-config-folder')
  ipcMain.removeHandler('open-claude-config-folder')
  ipcMain.removeHandler('save-settings')
  ipcMain.removeHandler('exec-command')
  ipcMain.removeHandler('add-provider')
  ipcMain.removeHandler('update-provider')
  ipcMain.removeHandler('delete-provider')
  ipcMain.removeHandler('update-default-model')
  ipcMain.removeHandler('update-router-model')
  ipcMain.removeHandler('update-long-context-threshold')
  ipcMain.removeHandler('get-home-dir')
  ipcMain.removeHandler('get-claude-settings-path')
  ipcMain.removeHandler('read-file')
  ipcMain.removeHandler('write-file')
  ipcMain.removeHandler('detect-network-mode')
  ipcMain.removeHandler('get-direct-config-path')
  ipcMain.removeHandler('read-direct-config')
  ipcMain.removeHandler('save-direct-config')
  ipcMain.removeHandler('apply-direct-config')
  ipcMain.removeHandler('switch-network-mode')

  console.log('[ConfigHandler] 配置处理器已注销')
}
