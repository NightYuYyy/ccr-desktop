# CLAUDE.md

本文件为Claude Code (claude.ai/code)提供在此仓库中工作的指导。

## 架构与构建概述

### 常用命令
- **开发**: `pnpm dev`
- **构建**: 
  - Windows: `pnpm build:win`
  - macOS: `pnpm build:mac`
  - Linux: `pnpm build:linux`
- **代码格式化**: `pnpm format`
- **代码检查**: `pnpm lint`

### 关键架构模式
1. **Electron + Vue 3**: 基于Electron的桌面应用，前端使用Vue 3渲染。
2. **Vite工具链**: 使用`electron-vite`进行开发与构建。
3. **多进程架构**: 包含主进程(`src/main`)、预加载脚本(`src/preload`)和渲染进程(`src/renderer`)。
4. **Electron Builder**: 支持多平台构建和自动更新。