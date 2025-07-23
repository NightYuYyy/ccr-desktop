import { ipcMain, shell } from 'electron'
import { spawn } from 'child_process'
import {
  readClaudeCodeRouterSettings,
  getConfigPaths,
  saveClaudeCodeRouterSettings,
  addProvider,
  updateProvider,
  deleteProvider,
  updateDefaultModel
} from '../services/configService.js'

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

  // 保存配置文件的处理器
  ipcMain.handle('save-settings', async (event, configData) => {
    try {
      console.log('[ConfigHandler] 开始保存配置文件')

      const result = await saveClaudeCodeRouterSettings(configData)

      if (result.success) {
        console.log('[ConfigHandler] 配置文件保存成功:', result.configPath)

        // {{ AURA-X: Add - 配置保存成功后刷新悬浮窗. Approval: 寸止确认. }}
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
        clearTimeout(serviceCheckTimeout)
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
        clearTimeout(serviceCheckTimeout)
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
      const serviceCheckTimeout = setTimeout(() => {
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

        // {{ AURA-X: Add - 默认模型更新成功后刷新悬浮窗. Approval: 寸止确认. }}
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

  console.log('[ConfigHandler] 配置处理器注册完成')
}

/**
 * 注销配置相关的IPC处理器
 */
export function unregisterConfigHandlers() {
  ipcMain.removeHandler('read-settings')
  ipcMain.removeHandler('get-config-paths')
  ipcMain.removeHandler('open-config-folder')
  ipcMain.removeHandler('save-settings')
  ipcMain.removeHandler('exec-command')
  ipcMain.removeHandler('add-provider')
  ipcMain.removeHandler('update-provider')
  ipcMain.removeHandler('delete-provider')
  ipcMain.removeHandler('update-default-model')
  console.log('[ConfigHandler] 配置处理器注销完成')
}
