# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 架构与构建概述

### 常用命令
- **开发**: `pnpm dev`
- **构建**: 
  - Windows: `pnpm build:win`
  - macOS: `pnpm build:mac`
  - Linux: `pnpm build:linux`
- **代码格式化**: `pnpm format`
- **代码检查**: `pnpm lint`

### 项目结构
这是一个基于Electron的桌面应用，用于管理Claude Code Router (CCR)服务：

```
src/
├── main/              # Electron主进程
│   ├── handlers/      # IPC处理器（配置相关）
│   ├── services/      # 业务服务（配置、悬浮窗）
│   └── utils/         # 工具函数
├── preload/           # 预加载脚本（IPC桥接）
└── renderer/          # Vue 3渲染进程
    └── src/
        ├── components/    # Vue组件
        ├── views/        # 页面组件
        └── assets/       # 静态资源
```

### 关键架构模式
1. **多窗口架构**: 主窗口（管理界面）+ 悬浮窗（状态显示）
2. **服务层设计**: 
   - `configService.js`: 配置文件管理
   - `floatingService.js`: 悬浮窗内容管理
3. **IPC通信**: 通过预加载脚本安全地暴露API给渲染进程
4. **Element Plus + UnoCSS**: UI组件库 + 原子化CSS框架
5. **自动导入**: unplugin-auto-import 和 unplugin-vue-components 支持组件自动导入

### 技术栈特性
- **打包工具**: electron-vite（基于Vite的Electron构建工具）
- **包管理**: pnpm
- **多入口构建**: 支持主窗口和悬浮窗两个HTML入口
- **系统托盘**: 支持托盘图标和右键菜单
- **自动更新**: 集成electron-updater