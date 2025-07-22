<template>
  <div class="space-y-6">
    <!-- 服务控制区域 -->
    <div class="bg-white rounded-lg shadow-md p-6">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="text-lg font-semibold text-gray-900">CCR服务控制</h3>
          <p class="text-sm text-gray-600 mt-1">启动Claude Code Router服务</p>
        </div>
        <div class="flex space-x-3">
          <el-button type="primary" @click="startService" :loading="isStarting" size="large">
            {{ isStarting ? '正在启动...' : '启动CCR服务' }}
          </el-button>
          <el-button @click="clearOutput" :disabled="!serviceOutput" size="large">
            清空日志
          </el-button>
        </div>
      </div>
    </div>

    <!-- 输出日志区域 -->
    <div class="bg-white rounded-lg shadow-md p-6">
      <h4 class="text-md font-semibold text-gray-900 mb-4">执行日志</h4>
      <div class="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm min-h-32 max-h-96 overflow-y-auto command-output">
        <pre v-if="serviceOutput" class="whitespace-pre-wrap">{{ serviceOutput }}</pre>
        <div v-else class="text-gray-500 italic">暂无日志输出</div>
      </div>
    </div>

    <!-- 服务状态信息 -->
    <div v-if="lastCommandResult" class="bg-white rounded-lg shadow-md p-6">
      <h4 class="text-md font-semibold text-gray-900 mb-4">执行结果</h4>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="flex items-center">
          <span class="text-sm font-medium text-gray-600 w-16">状态:</span>
          <el-tag :type="lastCommandResult.success ? 'success' : 'danger'">
            {{ lastCommandResult.success ? '成功' : '失败' }}
          </el-tag>
        </div>
        <div v-if="lastCommandResult.error" class="flex items-center">
          <span class="text-sm font-medium text-gray-600 w-16">错误:</span>
          <span class="text-sm text-red-600 truncate">{{ lastCommandResult.error }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

// 组件事件
const emit = defineEmits(['message'])

// 响应式数据
const isStarting = ref(false)
const serviceOutput = ref('')
const lastCommandResult = ref(null)

// 命令输出监听器
const handleCommandOutput = (event, { data }) => {
  serviceOutput.value += data
  // 滚动到底部
  nextTick(() => {
    const outputElement = document.querySelector('.command-output')
    if (outputElement) {
      outputElement.scrollTop = outputElement.scrollHeight
    }
  })
}

// 组件挂载时监听命令输出
onMounted(() => {
  window.api.onCommandOutput(handleCommandOutput)
})

// 组件卸载时清理监听器
onUnmounted(() => {
  window.api.removeCommandOutputListener(handleCommandOutput)
})

// 启动CCR服务
const startService = async () => {
  if (isStarting.value) return

  isStarting.value = true
  serviceOutput.value = '正在启动CCR服务...\n'
  lastCommandResult.value = null

  try {
    const result = await window.api.execCommand('ccr start')
    lastCommandResult.value = result

    if (result.success) {
      if (result.running) {
        serviceOutput.value += `\n✅ 服务启动成功，正在后台运行\n`
        emit('message', { text: 'CCR服务启动成功，正在后台运行', type: 'success' })
      } else if (!result.hasOutput) {
        serviceOutput.value += `✅ 命令执行成功（无输出）\n`
        emit('message', { text: '命令执行成功', type: 'success' })
      } else {
        emit('message', { text: '命令执行成功', type: 'success' })
      }
    } else {
      serviceOutput.value += `\n❌ 服务启动失败\n`
      if (result.error) {
        serviceOutput.value += `错误: ${result.error}\n`
      }
      emit('message', { text: `服务启动失败: ${result.error}`, type: 'error' })
    }
  } catch (error) {
    serviceOutput.value += `\n❌ 启动异常: ${error.message}\n`
    emit('message', { text: `启动异常: ${error.message}`, type: 'error' })
    console.error('启动服务异常:', error)
  } finally {
    isStarting.value = false
  }
}

// 清空输出日志
const clearOutput = () => {
  serviceOutput.value = ''
  lastCommandResult.value = null
}
</script>
