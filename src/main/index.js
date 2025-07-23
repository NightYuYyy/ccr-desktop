import { app, shell, BrowserWindow, Tray, Menu, dialog, ipcMain, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { registerConfigHandlers } from './handlers/index.js'
import { FloatingService } from './services/floatingService.js'

let tray = null
let floatingWindow = null

// {{ AURA-X: Add - 定期更新悬浮窗信息. Approval: 寸止确认. }}
let floatingWindowUpdateInterval = null

function startFloatingWindowUpdates() {
  // {{ AURA-X: Modify - 使用统一的FloatingService. Approval: 寸止确认. }}
  // 每30秒更新一次悬浮窗信息
  floatingWindowUpdateInterval = setInterval(async () => {
    if (floatingWindow && !floatingWindow.isDestroyed()) {
      try {
        const modelInfo = await FloatingService.getCurrentInfo()
        floatingWindow.webContents.send('update-content', modelInfo)
      } catch (error) {
        console.error('[FloatingWindow] 定期更新失败:', error)
      }
    }
  }, 30000)
}

function stopFloatingWindowUpdates() {
  if (floatingWindowUpdateInterval) {
    clearInterval(floatingWindowUpdateInterval)
    floatingWindowUpdateInterval = null
  }
}

// 创建悬浮窗函数
function createFloatingWindow() {
  // {{ AURA-X: Add - 计算屏幕右下角位置. Approval: 寸止确认. }}
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize

  // {{ AURA-X: Modify - 调整悬浮窗尺寸，拉宽显示模型名，降低高度. Approval: 寸止确认. }}
  const windowWidth = 350
  const windowHeight = 40
  const margin = 20 // 距离屏幕边缘的边距

  const x = screenWidth - windowWidth - margin
  const y = screenHeight - windowHeight - margin

  floatingWindow = new BrowserWindow({
    // {{ AURA-X: Modify - 调整为内容实际大小，消除多余透明区域. Approval: 寸止确认. }}
    width: windowWidth,
    height: windowHeight,
    // {{ AURA-X: Add - 完全隐藏窗口标识，防止系统显示任何标题. Approval: 寸止确认. }}
    title: '',
    show: false,
    alwaysOnTop: true,
    // {{ AURA-X: Modify - 使用backgroundColor替代transparent避免Windows灰色边框. Approval: 寸止确认. }}
    transparent: false,
    backgroundColor: '#00000000',
    frame: false,
    skipTaskbar: true,
    resizable: false,
    // {{ AURA-X: Modify - 禁用系统拖拽，使用CSS拖拽避免焦点状态. Approval: 寸止确认. }}
    movable: false,
    // {{ AURA-X: Modify - 禁用焦点以避免灰色边框显示. Approval: 寸止确认. }}
    focusable: false,
    // {{ AURA-X: Add - 防止在Alt+Tab等系统操作中显示. Approval: 寸止确认. }}
    minimizable: false,
    maximizable: false,
    closable: false,
    // {{ AURA-X: Modify - 设置为屏幕右下角位置. Approval: 寸止确认. }}
    x,
    y,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // 加载悬浮窗内容
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    floatingWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/floating.html`)
  } else {
    floatingWindow.loadFile(join(__dirname, '../renderer/floating.html'))
  }

    // 隐藏菜单栏
  floatingWindow.setMenuBarVisibility(false)

  // {{ AURA-X: Add - 确保标题为空，防止显示应用名称. Approval: 寸止确认. }}
  floatingWindow.setTitle('')

  // {{ AURA-X: Modify - 使用show()替代showInactive()以支持拖拽. Approval: 寸止确认. }}
  // 显示窗口
  floatingWindow.show()

  // {{ AURA-X: Modify - 使用统一的FloatingService并启动定期更新. Approval: 寸止确认. }}
  setTimeout(async () => {
    const modelInfo = await FloatingService.getCurrentInfo()
    floatingWindow.webContents.send('update-content', modelInfo)
    // 启动定期更新
    startFloatingWindowUpdates()
  }, 500)
}

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    // AURA-X: 优化配置管理面板的默认窗口尺寸
    width: 1280,        // 增加宽度以支持3列卡片布局
    height: 860,        // 增加高度以减少滚动需求
    minWidth: 900,      // 设置最小宽度，确保小屏幕下可用
    minHeight: 600,     // 设置最小高度
    center: true,       // 窗口居中显示
    show: false,
    autoHideMenuBar: true,
    resizable: true,    // 明确设置可调整大小
    maximizable: true,  // 允许最大化
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default', // macOS优化
    icon,
    // ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // {{ AURA-X: Modify - 让悬浮窗常驻显示，不依赖主窗口状态. Approval: 寸止确认. }}
  // 主窗口准备就绪后立即创建悬浮窗
  mainWindow.on('ready-to-show', () => {
    if (!floatingWindow) {
      createFloatingWindow()
    }
  })

  // 处理窗口关闭事件，提示用户选择最小化或关闭
  mainWindow.on('close', (event) => {
    // 阻止默认关闭行为
    event.preventDefault()

    // 显示对话框让用户选择
    dialog.showMessageBox(mainWindow, {
      type: 'question',
      buttons: ['最小化到托盘', '退出程序'],
      title: '确认操作',
      message: '您是要将程序最小化到系统托盘，还是完全退出程序？',
      cancelId: 0,  // 默认选择第一个按钮（最小化）
      defaultId: 0   // 默认高亮第一个按钮
    }).then(result => {
      if (result.response === 0) {
        // 最小化到托盘
        mainWindow.hide()
        // {{ AURA-X: Modify - 悬浮窗已常驻显示，无需重复创建. Approval: 寸止确认. }}
      } else {
        // 退出程序
        app.quit()
      }
    })
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()

    // 在开发环境下可选择性打开开发者工具
    if (is.dev) {
      // mainWindow.webContents.openDevTools()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // {{ AURA-X: Add - 设置空应用名称，防止系统显示默认应用名称. Approval: 寸止确认. }}
  app.setName('')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 注册所有IPC处理器
  registerConfigHandlers()

  const mainWindow = createWindow()

  // 创建系统托盘
  createTray(mainWindow)

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// 创建系统托盘图标和菜单
function createTray(mainWindow) {
  // 创建托盘图标
  tray = new Tray(icon)

  // 设置托盘图标提示
  tray.setToolTip('CCR Desktop')

  // 创建托盘菜单
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        mainWindow.show()
        // {{ AURA-X: Modify - 悬浮窗常驻显示，不再隐藏. Approval: 寸止确认. }}
      }
    },
    {
      label: '退出程序',
      click: () => {
        app.quit()
      }
    }
  ])

  // 设置托盘菜单
  tray.setContextMenu(contextMenu)

  // 监听托盘图标点击事件
  tray.on('click', () => {
    mainWindow.show()
    // {{ AURA-X: Modify - 悬浮窗常驻显示，不再隐藏. Approval: 寸止确认. }}
  })
}

// 添加IPC处理器用于更新悬浮窗内容
ipcMain.on('update-floating-window', (event, content) => {
  if (floatingWindow) {
    floatingWindow.webContents.send('update-content', content)

                // {{ AURA-X: Modify - 动态调整窗口宽度并保持右下角位置. Approval: 寸止确认. }}
    // {{ AURA-X: Modify - 增加最大宽度，让模型名称完整显示. Approval: 寸止确认. }}
    const minWidth = 250
    const maxWidth = 600 // 大幅增加最大宽度
    const padding = 70 // 左右padding、关闭按钮和状态圆点空间

    // 更精确的宽度计算：中文字符按12px，英文/数字按7px计算
    let textWidth = 0
    // {{ AURA-X: Modify - 统一按modelName计算宽度. Approval: 寸止确认. }}
    let text = ''
    if (content && content.modelName) {
      text = content.modelName
    } else if (typeof content === 'string') {
      text = content
    }

        for (let i = 0; i < text.length; i++) {
      const char = text.charAt(i)
      // 检测中文字符
      if (char.match(/[\u4e00-\u9fa5]/)) {
        textWidth += 12
      } else {
        textWidth += 7
      }
    }

    // 如果没有文本，使用默认宽度
    if (textWidth === 0) {
      textWidth = 80 // 默认文本宽度
    }

    const calculatedWidth = Math.min(maxWidth, Math.max(minWidth, textWidth + padding))
    const windowHeight = 40

    // 重新计算右下角位置
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize
    const margin = 20

    const x = screenWidth - calculatedWidth - margin
    const y = screenHeight - windowHeight - margin

    // 调整窗口大小和位置
    floatingWindow.setBounds({ x, y, width: calculatedWidth, height: windowHeight })
  }
})

// {{ AURA-X: Add - 新增IPC处理器支持手动调整悬浮窗尺寸. Approval: 寸止确认. }}
ipcMain.on('resize-floating-window', (event, width, height) => {
  if (floatingWindow) {
    floatingWindow.setSize(width || 350, height || 40)
  }
})

// {{ AURA-X: Add - 新增IPC处理器支持移动悬浮窗位置. Approval: 寸止确认. }}
ipcMain.on('move-floating-window', (event, deltaX, deltaY) => {
  if (floatingWindow) {
    const [currentX, currentY] = floatingWindow.getPosition()
    floatingWindow.setPosition(currentX + deltaX, currentY + deltaY)
  }
})

// 添加IPC处理器用于关闭悬浮窗
ipcMain.on('close-floating-window', () => {
  if (floatingWindow) {
    floatingWindow.hide()
  }
})

// {{ AURA-X: Modify - 使用统一的FloatingService处理刷新. Approval: 寸止确认. }}
ipcMain.on('refresh-floating-window', async () => {
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    try {
      const modelInfo = await FloatingService.getCurrentInfo()
      floatingWindow.webContents.send('update-content', modelInfo)
    } catch (error) {
      console.error('[FloatingWindow] 刷新失败:', error)
    }
  }
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // {{ AURA-X: Add - 应用退出时停止定期更新. Approval: 寸止确认. }}
    stopFloatingWindowUpdates()
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
