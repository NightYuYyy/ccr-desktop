<template>
  <div class="space-y-6">
    <!-- 服务控制区域 -->
    <div class="bg-white rounded-lg shadow-md p-6">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="text-lg font-semibold text-gray-900">CCR服务控制</h3>
          <p class="text-sm text-gray-600 mt-1">启动和管理Claude Code Router服务</p>
        </div>
        <div class="flex items-center space-x-3">
          <!-- 服务状态指示器 -->
          <div class="flex items-center space-x-2">
            <div :class="['w-2 h-2 rounded-full', isServiceRunning ? 'bg-green-500' : 'bg-gray-400']"></div>
            <span class="text-sm font-medium" :class="isServiceRunning ? 'text-green-600' : 'text-gray-600'">
              {{ isServiceRunning ? '服务运行中' : '服务已停止' }}
            </span>
          </div>

          <!-- 控制按钮 -->
          <div class="flex space-x-3">
            <el-button
              v-if="!isServiceRunning"
              type="primary"
              @click="startService"
              :loading="isStarting"
              size="large"
            >
              {{ isStarting ? '正在启动...' : '启动CCR服务' }}
            </el-button>

            <el-button
              v-if="isServiceRunning"
              type="danger"
              @click="stopService"
              :loading="isStopping"
              size="large"
            >
              {{ isStopping ? '正在停止...' : '停止CCR服务' }}
            </el-button>

            <el-button @click="checkServiceStatus" :loading="isCheckingStatus" size="large">
              {{ isCheckingStatus ? '检查中...' : '刷新状态' }}
            </el-button>

            <el-button @click="clearOutput" :disabled="!serviceOutput" size="large">
              清空日志
            </el-button>
          </div>
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
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'

// 组件事件
const emit = defineEmits(['message', 'service-status-changed'])

// 响应式数据
const isStarting = ref(false)
const isStopping = ref(false)
const isCheckingStatus = ref(false)
const serviceOutput = ref('')
const lastCommandResult = ref(null)

// 监听tab切换 - 通过props获取当前tab状态
const props = defineProps({
  activeTab: {
    type: String,
    default: ''
  },
  isServiceRunning: {
    type: Boolean,
    default: false
  }
})

// 监听全局服务状态变化
watch(() => props.isServiceRunning, (newStatus) => {
  console.log('[ServiceTab] 收到全局服务状态更新:', newStatus)
})

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


// 检查服务状态
const checkServiceStatus = async () => {
  if (isCheckingStatus.value) return

  isCheckingStatus.value = true

  try {
    const result = await window.api.execCommand('ccr status')

    // 根据命令输出内容判断服务状态
    // 检查stdout中是否包含运行状态信息
    if (result.success && result.stdout) {
      // 如果输出包含"Running"且不包含"Not Running"，则认为服务正在运行
      const output = result.stdout.toLowerCase()
      const isRunning = output.includes('running') && !output.includes('not running')
      // 不再设置本地状态，由全局状态管理
      // {{ AURA-X: Modify - 状态检测完成后统一刷新悬浮窗. Approval: 寸止确认. }}
    } else {
      // 命令执行失败或无输出，认为服务未运行
      // 不再设置本地状态，由全局状态管理
      // {{ AURA-X: Modify - 状态检测完成后统一刷新悬浮窗. Approval: 寸止确认. }}
    }

    console.log('[ServiceTab] 服务状态检查结果:', {
      success: result.success,
      stdout: result.stdout,
      isRunning: isServiceRunning.value
    })
  } catch (error) {
    console.error('[ServiceTab] 检查服务状态异常:', error)
    // 不再设置本地状态，由全局状态管理
  } finally {
    isCheckingStatus.value = false
  }
}

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
        // 通知父组件更新全局状态
        emit('service-status-changed', true)
        // {{ AURA-X: Modify - 服务启动后统一刷新悬浮窗. Approval: 寸止确认. }}
        } else if (!result.hasOutput) {
        serviceOutput.value += `✅ 命令执行成功（无输出）\n`
        emit('message', { text: '命令执行成功', type: 'success' })
        // 执行状态检查确认服务状态
        await checkServiceStatus()
        // {{ AURA-X: Modify - 执行状态检查后统一刷新悬浮窗. Approval: 寸止确认. }}
        } else {
        emit('message', { text: '命令执行成功', type: 'success' })
        // 执行状态检查确认服务状态
        await checkServiceStatus()
        // {{ AURA-X: Modify - 执行状态检查后统一刷新悬浮窗. Approval: 寸止确认. }}
        }
    } else {
      serviceOutput.value += `\n❌ 服务启动失败\n`
      if (result.error) {
        serviceOutput.value += `错误: ${result.error}\n`
      }
      emit('message', { text: `服务启动失败: ${result.error}`, type: 'error' })
      // 不再设置本地状态，由全局状态管理 // 确保状态正确
    }
  } catch (error) {
    serviceOutput.value += `\n❌ 启动异常: ${error.message}\n`
    emit('message', { text: `启动异常: ${error.message}`, type: 'error' })
    console.error('启动服务异常:', error)
    // 不再设置本地状态，由全局状态管理
  } finally {
    isStarting.value = false
  }
}

// 停止CCR服务
const stopService = async () => {
  if (isStopping.value) return

  isStopping.value = true
  serviceOutput.value += '\n正在停止CCR服务...\n'

  try {
    const result = await window.api.execCommand('ccr stop')
    lastCommandResult.value = result

    if (result.success) {
      serviceOutput.value += `\n✅ 服务停止成功\n`
      emit('message', { text: 'CCR服务已停止', type: 'success' })
      // 通知父组件更新全局状态
      emit('service-status-changed', false)
              // {{ AURA-X: Modify - 服务停止后统一刷新悬浮窗. Approval: 寸止确认. }}
      } else {
      serviceOutput.value += `\n❌ 服务停止失败\n`
      if (result.error) {
        serviceOutput.value += `错误: ${result.error}\n`
      }
      emit('message', { text: `服务停止失败: ${result.error}`, type: 'error' })
      // 执行状态检查确认实际状态
      await checkServiceStatus()
    }
  } catch (error) {
    serviceOutput.value += `\n❌ 停止异常: ${error.message}\n`
    emit('message', { text: `停止异常: ${error.message}`, type: 'error' })
    console.error('停止服务异常:', error)
    // 执行状态检查确认实际状态
    await checkServiceStatus()
  } finally {
    isStopping.value = false
  }
}

// 清空输出日志
const clearOutput = () => {
  serviceOutput.value = ''
  lastCommandResult.value = null
}
</script>
