<template>
  <!-- {{ AURA-X: Modify - 优化布局，添加模型名称和服务状态圆点显示. Approval: 寸止确认. }} -->
  <div class="floating-window">
    <div class="floating-content" @mousedown="startDrag">
      <div class="header">
        <div class="model-name">{{ modelName }}</div>
        <button class="close-btn" @click="closeWindow" @mousedown.stop>×</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

// {{ AURA-X: Modify - 分离模型名称和服务状态显示. Approval: 寸止确认. }}
const modelName = ref('未设置模型')
let isDragging = false
let lastX = 0
let lastY = 0

// 监听主进程发送的内容更新消息
const handleUpdateContent = (event, data) => {
  // {{ AURA-X: Modify - 始终显示模型名称. Approval: 寸止确认. }}
  if (data && typeof data === 'object') {
    // 始终显示模型名称
    modelName.value = data.modelName || '未设置模型'
  } else if (typeof data === 'string') {
    // 向后兼容字符串格式
    modelName.value = data || '未设置模型'
  }
}

// 关闭窗口函数
const closeWindow = () => {
  window.api.closeFloatingWindow()
}

// {{ AURA-X: Add - 实现基于IPC的拖拽功能，避免窗口焦点状态. Approval: 寸止确认. }}
// 拖拽功能实现
const startDrag = (e) => {
  // 防止在点击关闭按钮时触发拖动
  if (e.target.closest('.close-btn')) {
    return
  }

  isDragging = true
  lastX = e.screenX
  lastY = e.screenY
  e.preventDefault()

  // 添加全局事件监听器
  document.addEventListener('mousemove', drag)
  document.addEventListener('mouseup', endDrag)
}

const drag = (e) => {
  if (isDragging) {
    const deltaX = e.screenX - lastX
    const deltaY = e.screenY - lastY

    // 通过IPC移动窗口
    window.api.moveFloatingWindow(deltaX, deltaY)

    lastX = e.screenX
    lastY = e.screenY
  }
}

const endDrag = () => {
  isDragging = false

  // 移除全局事件监听器
  document.removeEventListener('mousemove', drag)
  document.removeEventListener('mouseup', endDrag)
}

onMounted(() => {
  // 添加事件监听器
  window.api.onUpdateContent(handleUpdateContent)

  // {{ AURA-X: Modify - 组件挂载后立即请求最新模型信息. Approval: 寸止确认. }}
  // 设置初始状态为加载中
  modelName.value = '正在加载...'

  // 挂载完成后立即请求最新数据
  setTimeout(() => {
    window.api.refreshFloatingWindow()
  }, 100)
})

onUnmounted(() => {
  // 移除事件监听器
  window.api.removeUpdateContentListener(handleUpdateContent)

  // 清理拖拽事件监听器
  document.removeEventListener('mousemove', drag)
  document.removeEventListener('mouseup', endDrag)
})
</script>

<style scoped>
/* {{ AURA-X: Modify - 配合backgroundColor模式，确保容器完全透明. Approval: 寸止确认. }} */
.floating-window {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0);
  /* {{ AURA-X: Add - 确保右键菜单不被裁剪. Approval: 寸止确认. }} */
  overflow: visible;
  position: relative;
}

.floating-content {
  background: rgba(0, 0, 0, 0.7);
  color: white;
  /* {{ AURA-X: Modify - 适应更低的高度，调整内边距. Approval: 寸止确认. }} */
  padding: 6px 10px;
  border-radius: 6px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 12px;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  opacity: 0.9;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  /* {{ AURA-X: Add - 添加拖拽光标样式. Approval: 寸止确认. }} */
  cursor: move;
  user-select: none;
}

.floating-content:hover {
  opacity: 1;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap: 8px;
}

.model-name {
  margin: 0;
  padding: 0;
  /* {{ AURA-X: Modify - 移除文本截断，让模型名称完整显示. Approval: 寸止确认. }} */
  white-space: nowrap;
  flex-grow: 1;
  text-align: left;
  font-weight: 500;
  font-size: 11px;
  line-height: 1.2;
}

.close-btn {
  background: transparent;
  border: none;
  color: white;
  font-size: 12px;
  cursor: pointer;
  padding: 2px;
  width: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  flex-shrink: 0;
  /* {{ AURA-X: Modify - 适应新的高度，调整按钮大小. Approval: 寸止确认. }} */
  z-index: 10;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
