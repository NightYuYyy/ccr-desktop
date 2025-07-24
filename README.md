# ccr-desktop

Claude Code Router (CCR) 桌面管理面板

一个基于 Electron 和 Vue 3 的跨平台桌面应用程序，用于管理和配置 Claude Code Router 服务。

## 功能特性

- 🖥️ 跨平台支持 (Windows, macOS, Linux)
- ⚙️ 图形化配置管理界面
- 🚀 CCR 服务一键启动/停止
- 📊 实时服务状态监控
- 📜 命令行执行日志查看
- 🎯 默认模型快速切换
- 🌐 多服务商 API 配置管理

## 推荐 IDE 设置

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar)

## 项目设置

### 安装依赖

```bash
$ pnpm install
```

### 开发模式

```bash
$ pnpm dev
```

### 构建应用

```bash
# For windows
$ pnpm build:win

# For macOS
$ pnpm build:mac

# For Linux
$ pnpm build:linux
```

## 项目结构

```
src/
├── main/          # Electron 主进程代码
├── preload/       # 预加载脚本
└── renderer/      # Vue 渲染进程代码
    ├── src/       # Vue 组件和逻辑
    │   ├── components/  # Vue 组件
    │   └── assets/      # 静态资源
    └── index.html     # 渲染进程入口文件
```

## 开发环境要求

- Node.js >= 16.0.0
- pnpm >= 8.0.0
- Python >= 3.8 (用于 node-gyp)

## 代码质量

### 代码格式化

```bash
$ pnpm format
```

### 代码检查

```bash
$ pnpm lint
```
