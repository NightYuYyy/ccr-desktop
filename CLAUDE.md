# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 常用命令

- **开发**: `pnpm dev`
- **构建**:
  - Windows: `pnpm build:win`
  - macOS: `pnpm build:mac`
  - Linux: `pnpm build:linux`
- **代码格式化**: `pnpm format`
- **代码检查**: `pnpm lint`
- **预览**: `pnpm start`

## 项目概述

这是一个基于Electron的桌面应用，用于管理Claude Code Router (CCR)服务。应用采用多窗口架构，包含主管理界面和悬浮窗状态显示。

## 核心架构

### 多窗口架构

1. **主窗口** (`src/main/index.js`): 完整的管理界面，提供配置管理、服务控制等功能
2. **悬浮窗** (`src/renderer/floating.html`): 右下角常驻显示，实时展示当前模型和服务状态

### 服务层设计

- **`configService.js`**: Claude Code Router配置文件的CRUD操作
  - 支持Provider的增删改查
  - 管理默认模型和路由器配置
  - 长文本阈值设置
- **`floatingService.js`**: 悬浮窗内容统一管理
  - 获取当前模型信息
  - 检测CCR服务运行状态
  - 提供定期更新机制

### IPC通信架构

- **预加载脚本** (`src/preload/index.js`): 安全暴露主进程API给渲染进程
- **IPC处理器** (`src/main/handlers/`): 处理来自渲染进程的请求
  - `configHandlers.js`: 配置文件操作相关的细粒度API
- **消息通信**: 支持双向通信和事件监听

## 技术栈特性

### 构建工具

- **electron-vite**: 基于Vite的Electron构建工具
- **多入口构建**: 支持主窗口和悬浮窗两个独立的HTML入口
- **热重载**: 开发环境下的实时刷新

### 前端技术栈

- **Vue 3**: 响应式框架，使用Composition API
- **Element Plus**: UI组件库
- **UnoCSS**: 原子化CSS框架
- **自动导入**: unplugin-auto-import 和 unplugin-vue-components

### Electron特性

- **系统托盘**: 支持托盘图标和右键菜单
- **窗口管理**: 主窗口可最小化到托盘，悬浮窗常驻显示
- **自动更新**: 集成electron-updater
- **跨平台**: 支持Windows、macOS、Linux

## 关键组件

### Vue组件结构

- **`App.vue`**: 主应用组件，包含Tab导航和全局状态管理
- **`ConfigTab.vue`**: CCR配置管理界面
- **`ClaudeConfigTab.vue`**: Claude桌面应用配置
- **`ServiceTab.vue`**: 服务启动/停止控制
- **`MultiModelConfig.vue`**: 多模型路由配置
- **`FloatingWindow.vue`**: 悬浮窗组件

### 配置管理

- **CCR配置**: `~/.claude-code-router/config.json`
- **Provider管理**: 支持多个AI服务提供商配置
- **模型路由**: 支持默认、背景、思考、长文本等场景的模型选择

### 悬浮窗特性

- **常驻显示**: 位于屏幕右下角，始终置顶
- **动态调整**: 根据模型名称长度自动调整窗口宽度
- **定期更新**: 每30秒自动刷新状态信息
- **无焦点设计**: 避免干扰用户操作

## 开发注意事项

### 文件操作

- 使用 `src/main/utils/fileUtils.js` 和 `pathUtils.js` 进行安全的文件操作
- 配置文件读写都有错误处理和用户友好的提示

### 进程通信

- 所有IPC调用都有错误处理
- 使用细粒度API避免传递大对象
- 事件监听器需要在组件卸载时清理

### 状态管理

- Vue组件使用本地状态管理
- 配置数据通过IPC从主进程获取
- 悬浮窗状态通过定期更新机制保持同步

## 网络模式管理

应用支持两种网络模式的智能切换：

### 代理模式

- 通过 Claude Code Router (CCR) 服务转发请求
- 配置文件：`~/.claude-code-router/config.json`
- 支持多个AI服务提供商的统一管理

### 直连模式

- 直接连接AI服务商API
- 配置文件：`~/.config/claude-desktop/settings.json`
- 支持多配置文件快速切换

### 模式切换

- 系统托盘菜单提供快速切换功能
- 主界面网络模式开关自动检测当前状态
- 悬浮窗实时显示当前模式和服务商信息

## 数据备份与恢复

### WebDAV备份

- 支持远程WebDAV服务器备份配置文件
- 自动备份和手动备份功能
- 备份文件版本管理

### 本地备份

- 配置文件本地定时备份
- 备份文件存储在 `~/.ccr-desktop/backups/`
- 支持备份文件恢复

## 开发建议

- 每次任务进行后不要运行dev 和build
