<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import ConfigTab from './components/ConfigTab.vue'
import ServiceTab from './components/ServiceTab.vue'
import ClaudeConfigTab from './components/ClaudeConfigTab.vue'
import MultiModelConfig from './components/MultiModelConfig.vue'
import BackupDataTab from './components/BackupDataTab.vue'

// 统一消息管理函数 - 确保同时只显示一条消息
const showMessage = (message, type = 'info') => {
  ElMessage.closeAll() // 关闭所有现有消息
  return ElMessage[type](message)
}

// 响应式数据
const activeTab = ref('config')
const configData = ref(null)
const isLoading = ref(false)
const configPaths = ref(null)
const selectedProvider = ref(null)
const showProviderDialog = ref(false)
const showAddProviderDialog = ref(false)
const useProxy = ref(false)
const showClaudeSettingsDialog = ref(false)
const claudeSettingsContent = ref('')
const savingClaudeSettings = ref(false)
const jsonError = ref('')
const jsonValid = ref(false)
const jsonEditor = ref(null)

// 服务状态全局管理
const isServiceRunning = ref(false)
const isCheckingServiceStatus = ref(false)
let servicePollingInterval = null
const newProvider = ref({
  name: '',
  api_base_url: '',
  api_key: '',
  models: [],
  transformer: null
})

// 临时模型输入
const newModelInput = ref('')
const newTransformerText = ref('')
const selectedProviderTransformerText = ref('')

// 自动加载配置
onMounted(() => {
  // 监听Claude配置保存事件
  window.addEventListener('claude-config-saved', handleClaudeConfigSaved)

  // {{ AURA-X: Add - 监听托盘菜单的网络模式变更事件. Approval: 寸止确认. }}
  // 监听来自托盘菜单的网络模式变更
  window.api.onNetworkModeChanged && window.api.onNetworkModeChanged(handleNetworkModeChanged)

  loadConfig()
  loadConfigPaths()
  detectNetworkMode() // 自动检测网络模式

  // {{ AURA-X: Modify - 应用启动时触发悬浮窗刷新. Approval: 寸止确认. }}
  // 通过主进程统一更新悬浮窗状态
  window.api.refreshFloatingWindow()

  // 启动服务状态轮询
  startServicePolling()
})

// {{ AURA-X: Modify - 简化为直接触发主进程刷新，避免重复逻辑. Approval: 寸止确认. }}
const updateFloatingWindowWithCurrentInfo = async () => {
  // 直接触发主进程刷新，由主进程统一处理模型信息获取和服务状态检测
  window.api.refreshFloatingWindow()
}

// 服务状态轮询管理
const startServicePolling = () => {
  // 立即检查一次
  checkGlobalServiceStatus()

  // 每30秒轮询一次
  servicePollingInterval = setInterval(() => {
    checkGlobalServiceStatus()
  }, 30000)
}

const stopServicePolling = () => {
  if (servicePollingInterval) {
    clearInterval(servicePollingInterval)
    servicePollingInterval = null
  }
}

// 全局服务状态检查
const checkGlobalServiceStatus = async () => {
  if (isCheckingServiceStatus.value) return

  isCheckingServiceStatus.value = true
  try {
    const result = await window.api.execCommand('ccr status')
    if (result.success && result.stdout) {
      const output = result.stdout.toLowerCase()
      const isRunning = output.includes('running') && !output.includes('not running')
      isServiceRunning.value = isRunning
    } else {
      isServiceRunning.value = false
    }
  } catch (error) {
    console.error('[App] 服务状态检查异常:', error)
    isServiceRunning.value = false
  } finally {
    isCheckingServiceStatus.value = false
  }
}

// 组件卸载时清理监听器
onUnmounted(() => {
  // 清理Claude配置保存事件监听器
  window.removeEventListener('claude-config-saved', handleClaudeConfigSaved)

  // {{ AURA-X: Add - 清理网络模式变更事件监听器. Approval: 寸止确认. }}
  // 清理网络模式变更事件监听器
  window.api.removeNetworkModeChangedListener &&
    window.api.removeNetworkModeChangedListener(handleNetworkModeChanged)

  // 清理服务状态轮询
  stopServicePolling()
})

// 处理Claude配置保存事件
const handleClaudeConfigSaved = () => {
  console.log('[App] 收到Claude配置保存事件，重新检测网络模式')
  detectNetworkMode()
}

// {{ AURA-X: Add - 处理托盘菜单的网络模式变更事件. Approval: 寸止确认. }}
// 处理网络模式变更事件
const handleNetworkModeChanged = ({ isProxy }) => {
  console.log('[App] 收到网络模式变更事件:', isProxy ? '代理模式' : '直连模式')
  useProxy.value = isProxy
  // 重新检测网络模式以确保状态一致
  detectNetworkMode()
}

// 加载配置文件
const loadConfig = async () => {
  isLoading.value = true

  try {
    const result = await window.api.readSettings()

    if (result.success) {
      configData.value = result.data
      showMessage('配置加载成功', 'success')

      // {{ AURA-X: Modify - 配置加载后更新悬浮窗. Approval: 寸止确认. }}
      // 更新悬浮窗显示的模型信息和服务状态
      updateFloatingWindowWithCurrentInfo()
    } else {
      configData.value = null
      showMessage('配置文件加载失败', 'error')
      console.warn('配置加载失败:', result.error)
    }
  } catch (error) {
    configData.value = null
    showMessage(`配置加载异常: ${error.message}`, 'error')
    console.error('配置加载异常:', error)
  } finally {
    isLoading.value = false
  }
}

// 加载配置路径信息
const loadConfigPaths = async () => {
  try {
    const result = await window.api.getConfigPaths()
    if (result.success) {
      configPaths.value = result.data
    }
  } catch (error) {
    console.error('获取配置路径失败:', error)
  }
}

// 打开CCR配置文件夹
const openConfigFolder = async () => {
  try {
    const result = await window.api.openConfigFolder()
    if (result.success) {
      showMessage('CCR配置文件夹已打开', 'success')
    } else {
      showMessage(`打开CCR配置文件夹失败: ${result.error}`, 'error')
    }
  } catch (error) {
    showMessage(`打开CCR配置文件夹异常: ${error.message}`, 'error')
    console.error('打开CCR配置文件夹异常:', error)
  }
}

// 打开Claude配置文件夹
const openClaudeConfigFolder = async () => {
  try {
    const result = await window.api.openClaudeConfigFolder()
    if (result.success) {
      showMessage('Claude配置文件夹已打开', 'success')
    } else {
      showMessage(`打开Claude配置文件夹失败: ${result.error}`, 'error')
    }
  } catch (error) {
    showMessage(`打开Claude配置文件夹异常: ${error.message}`, 'error')
    console.error('打开Claude配置文件夹异常:', error)
  }
}

// 检测网络模式
const detectNetworkMode = async () => {
  try {
    const result = await window.api.detectNetworkMode()
    if (result.success) {
      useProxy.value = result.isProxy
      console.log('[NetworkMode] 检测到网络模式:', result.mode, result.message)
    } else {
      console.warn('[NetworkMode] 检测失败:', result.error)
      useProxy.value = false
    }
  } catch (error) {
    console.error('[NetworkMode] 检测异常:', error)
    useProxy.value = false
  }
}

// 刷新配置
const refreshConfig = () => {
  showMessage('正在刷新配置...', 'info')
  loadConfig()
}

// 显示Provider详情
const showProviderDetail = (provider) => {
  selectedProvider.value = { ...provider }
  // 初始化转换器文本
  selectedProviderTransformerText.value = provider.transformer
    ? JSON.stringify(provider.transformer, null, 2)
    : ''
  showProviderDialog.value = true
}

// 显示添加Provider弹窗
const showAddProvider = () => {
  newProvider.value = {
    name: '',
    api_base_url: '',
    api_key: '',
    models: [],
    transformer: null
  }
  newModelInput.value = ''
  newTransformerText.value = ''
  showAddProviderDialog.value = true
}

// 关闭弹窗
const closeProviderDialog = () => {
  showProviderDialog.value = false
  selectedProvider.value = null
  selectedProviderTransformerText.value = ''
}

// 关闭添加Provider弹窗
const closeAddProviderDialog = () => {
  showAddProviderDialog.value = false
  newProvider.value = {
    name: '',
    api_base_url: '',
    api_key: '',
    models: [],
    transformer: null
  }
  newModelInput.value = ''
  newTransformerText.value = ''
}

// 添加模型到现有Provider
const addModelToProvider = () => {
  if (newModelInput.value.trim()) {
    if (!selectedProvider.value.models) {
      selectedProvider.value.models = []
    }
    selectedProvider.value.models.push(newModelInput.value.trim())
    newModelInput.value = ''
  }
}

// 从Provider删除模型
const removeModelFromProvider = (model) => {
  const index = selectedProvider.value.models.indexOf(model)
  if (index > -1) {
    selectedProvider.value.models.splice(index, 1)
  }
}

// 添加模型到新Provider
const addModelToNewProvider = () => {
  if (newModelInput.value.trim()) {
    newProvider.value.models.push(newModelInput.value.trim())
    newModelInput.value = ''
  }
}

// 从新Provider删除模型
const removeModelFromNewProvider = (model) => {
  const index = newProvider.value.models.indexOf(model)
  if (index > -1) {
    newProvider.value.models.splice(index, 1)
  }
}

// 删除Provider
const deleteProvider = async () => {
  if (!selectedProvider.value) return

  try {
    await ElMessageBox.confirm(
      `确定要删除服务商 "${selectedProvider.value.name}" 吗？此操作无法撤销。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )

    try {
      // 使用细粒度API删除Provider
      const providerName = selectedProvider.value.name
      const result = await window.api.deleteProvider(providerName)

      if (result.success) {
        // 从本地缓存中移除
        if (configData.value?.Providers) {
          const index = configData.value.Providers.findIndex((p) => p.name === providerName)
          if (index > -1) {
            configData.value.Providers.splice(index, 1)
          }

          // 如果删除的Provider是当前默认模型的Provider，清空默认路由
          if (configData.value.Router?.default?.startsWith(providerName + ',')) {
            configData.value.Router.default = ''
          }
        }

        showMessage(`服务商 "${providerName}" 已删除`, 'success')
        closeProviderDialog()
      } else {
        showMessage(`删除失败: ${result.error}`, 'error')
      }
    } catch (error) {
      showMessage(`删除异常: ${error.message}`, 'error')
      console.error('删除配置异常:', error)
    }
  } catch {
    // 用户取消删除
    showMessage('已取消删除', 'info')
  }
}

// 保存Provider配置
const saveProviderConfig = async () => {
  // 验证并解析transformer JSON
  if (selectedProviderTransformerText.value.trim()) {
    try {
      selectedProvider.value.transformer = JSON.parse(selectedProviderTransformerText.value)
    } catch {
      showMessage('Transformer JSON格式错误', 'error')
      return
    }
  } else {
    // 如果转换器配置为空，删除该字段而不是设置为null
    delete selectedProvider.value.transformer
  }

  try {
    // 使用细粒度API更新Provider
    const providerName = selectedProvider.value.name
    // 将响应式对象转换为普通对象，避免序列化错误
    const providerData = JSON.parse(JSON.stringify(selectedProvider.value))
    const result = await window.api.updateProvider(providerName, providerData)

    if (result.success) {
      // 更新本地缓存数据
      if (configData.value?.Providers) {
        const index = configData.value.Providers.findIndex((p) => p.name === providerName)
        if (index > -1) {
          configData.value.Providers[index] = { ...selectedProvider.value }
        }
      }

      showMessage('配置已保存', 'success')
      closeProviderDialog()
    } else {
      showMessage(`保存失败: ${result.error}`, 'error')
    }
  } catch (error) {
    showMessage(`保存异常: ${error.message}`, 'error')
    console.error('保存配置异常:', error)
  }
}

// 保存新Provider
const saveNewProvider = async () => {
  // 验证必填字段
  if (!newProvider.value.name.trim()) {
    showMessage('请输入服务商名称', 'error')
    return
  }
  if (!newProvider.value.api_base_url.trim()) {
    showMessage('请输入API地址', 'error')
    return
  }

  // 解析transformer JSON
  if (newTransformerText.value.trim()) {
    try {
      newProvider.value.transformer = JSON.parse(newTransformerText.value)
    } catch {
      showMessage('Transformer JSON格式错误', 'error')
      return
    }
  } else {
    // 如果转换器配置为空，删除该字段而不是设置为null
    delete newProvider.value.transformer
  }

  try {
    // 使用细粒度API添加Provider
    // 将响应式对象转换为普通对象，避免序列化错误
    const providerData = JSON.parse(JSON.stringify(newProvider.value))
    const result = await window.api.addProvider(providerData)

    if (result.success) {
      // 添加到本地缓存数据
      if (!configData.value) {
        configData.value = { LOG: false, Providers: [], Router: { default: '' } }
      }
      if (!configData.value.Providers) {
        configData.value.Providers = []
      }

      configData.value.Providers.push({ ...newProvider.value })

      showMessage(`服务商 "${newProvider.value.name}" 已添加`, 'success')
      closeAddProviderDialog()
    } else {
      showMessage(`添加失败: ${result.error}`, 'error')
    }
  } catch (error) {
    showMessage(`添加异常: ${error.message}`, 'error')
    console.error('添加配置异常:', error)
  }
}

// 保存默认模型选择
const saveDefaultModel = async (selectedModel) => {
  try {
    // 使用细粒度API更新默认模型
    const result = await window.api.updateDefaultModel(selectedModel)

    if (result.success) {
      // 更新本地缓存数据
      if (!configData.value.Router) {
        configData.value.Router = {}
      }
      configData.value.Router.default = selectedModel

      showMessage('默认模型已保存', 'success')

      // {{ AURA-X: Modify - 默认模型保存后更新悬浮窗. Approval: 寸止确认. }}
      // 更新悬浮窗显示的模型信息和服务状态
      updateFloatingWindowWithCurrentInfo()
    } else {
      showMessage(`保存失败: ${result.error}`, 'error')
    }
  } catch (error) {
    showMessage(`保存异常: ${error.message}`, 'error')
    console.error('保存默认模型异常:', error)
  }
}

// 保存路由器模型配置
const saveRouterModel = async ({ type, value }) => {
  try {
    // 使用细粒度API更新路由器模型
    const result = await window.api.updateRouterModel(type, value)

    if (result.success) {
      // 更新本地缓存数据
      if (!configData.value.Router) {
        configData.value.Router = {}
      }
      configData.value.Router[type] = value

      showMessage(`${type}模型已保存`, 'success')

      // {{ AURA-X: Modify - 模型保存后更新悬浮窗. Approval: 寸止确认. }}
      // 更新悬浮窗显示的模型信息和服务状态
      updateFloatingWindowWithCurrentInfo()
    } else {
      showMessage(`保存失败: ${result.error}`, 'error')
    }
  } catch (error) {
    showMessage(`保存异常: ${error.message}`, 'error')
    console.error(`保存${type}模型异常:`, error)
  }
}

// 保存长文本阈值配置
const saveLongContextThreshold = async (threshold) => {
  try {
    // 使用细粒度API更新长文本阈值
    const result = await window.api.updateLongContextThreshold(threshold)

    if (result.success) {
      // 更新本地缓存数据
      if (!configData.value.Router) {
        configData.value.Router = {}
      }
      configData.value.Router.longContextThreshold = threshold

      showMessage('长文本阈值已保存', 'success')

      // {{ AURA-X: Modify - 阈值保存后更新悬浮窗. Approval: 寸止确认. }}
      // 更新悬浮窗显示的模型信息和服务状态
      updateFloatingWindowWithCurrentInfo()
    } else {
      showMessage(`保存失败: ${result.error}`, 'error')
    }
  } catch (error) {
    showMessage(`保存异常: ${error.message}`, 'error')
    console.error('保存长文本阈值异常:', error)
  }
}

// 保存所有路由器配置
const saveAllRouterConfig = async (routerConfig) => {
  try {
    // 使用整体保存API更新路由器配置
    // 创建完整的配置数据对象，确保使用原始数据而不是Vue ref
    // 深度克隆以确保所有数据都是可序列化的
    const fullConfigData = JSON.parse(
      JSON.stringify({
        ...configData.value,
        Router: routerConfig
      })
    )

    const result = await window.api.saveSettings(fullConfigData)

    if (result.success) {
      // 更新本地缓存数据
      configData.value.Router = { ...routerConfig }

      showMessage('所有路由器配置已保存', 'success')

      // {{ AURA-X: Modify - 配置保存后更新悬浮窗. Approval: 寸止确认. }}
      // 更新悬浮窗显示的模型信息和服务状态
      updateFloatingWindowWithCurrentInfo()
    } else {
      showMessage(`保存失败: ${result.error}`, 'error')
    }
  } catch (error) {
    showMessage(`保存异常: ${error.message}`, 'error')
    console.error('保存所有路由器配置异常:', error)
  }
}

// 处理服务消息
const handleServiceMessage = ({ text, type }) => {
  showMessage(text, type)
}

// 处理服务状态变化
const handleServiceStatusChange = (isRunning) => {
  console.log('[App] 收到服务状态变化:', isRunning)
  isServiceRunning.value = isRunning
  // 更新悬浮窗
  updateFloatingWindowWithCurrentInfo()
}

// {{ AURA-X: Modify - 完善全局代理切换逻辑，实现实际的网络模式切换. Approval: 寸止确认. }}
// JSON 语法高亮
const highlightJson = (jsonString) => {
  if (!jsonString) return ''

  return jsonString
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/(".*?"):/g, '<span class="json-key">$1</span>:')
    .replace(/:\s*(true|false|null)/g, ': <span class="json-boolean">$1</span>')
    .replace(/:\s*(-?\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
    .replace(/:\s*"([^"]*)"/g, ': <span class="json-string">"$1"</span>')
    .replace(/(\{|\}|\[|\]|,)/g, '<span class="json-bracket">$1</span>')
}

// 更新JSON编辑器内容
const updateJsonEditor = () => {
  if (jsonEditor.value) {
    const highlighted = highlightJson(claudeSettingsContent.value)
    jsonEditor.value.innerHTML =
      highlighted || '<span class="json-placeholder">请输入有效的JSON配置...</span>'
  }
}

// 处理JSON输入
const handleJsonInput = (event) => {
  const content = event.target.innerText || event.target.textContent
  claudeSettingsContent.value = content
  validateJson()
}

// 处理JSON粘贴
const handleJsonPaste = (event) => {
  event.preventDefault()
  const pastedText = event.clipboardData.getData('text')
  document.execCommand('insertText', false, pastedText)
  setTimeout(() => {
    claudeSettingsContent.value = jsonEditor.value.innerText || jsonEditor.value.textContent
    validateJson()
  }, 0)
}

// 处理键盘事件
const handleJsonKeydown = (event) => {
  // 支持Tab键缩进
  if (event.key === 'Tab') {
    event.preventDefault()
    document.execCommand('insertText', false, '  ')
  }
}

// 验证JSON格式
const validateJson = () => {
  if (!claudeSettingsContent.value.trim()) {
    jsonError.value = ''
    jsonValid.value = false
    return
  }

  try {
    JSON.parse(claudeSettingsContent.value)
    jsonError.value = ''
    jsonValid.value = true
  } catch (error) {
    jsonError.value = `JSON 格式错误: ${error.message}`
    jsonValid.value = false
  }
}

// 格式化JSON
const formatJson = () => {
  if (!claudeSettingsContent.value.trim()) return

  try {
    const parsed = JSON.parse(claudeSettingsContent.value)
    const formatted = JSON.stringify(parsed, null, 2)
    claudeSettingsContent.value = formatted
    updateJsonEditor()
    validateJson()
    showMessage('JSON 已格式化', 'success')
  } catch {
    showMessage('JSON 格式错误，无法格式化', 'error')
  }
}

// 编辑Claude settings.json
const editClaudeSettings = async () => {
  try {
    // 获取Claude settings.json文件路径
    const pathResult = await window.api.getClaudeSettingsPath()
    if (!pathResult.success) {
      showMessage(`获取配置文件路径失败: ${pathResult.error}`, 'error')
      return
    }

    // 读取settings.json文件
    const readResult = await window.api.readFile(pathResult.data)
    if (readResult.success) {
      // 格式化JSON并显示
      claudeSettingsContent.value = JSON.stringify(readResult.data, null, 2)
      jsonError.value = ''
      jsonValid.value = true
      showClaudeSettingsDialog.value = true

      // 等待DOM更新后设置编辑器内容
      setTimeout(() => {
        updateJsonEditor()
      }, 100)
    } else {
      showMessage(`读取配置文件失败: ${readResult.error}`, 'error')
    }
  } catch (error) {
    showMessage(`编辑配置文件异常: ${error.message}`, 'error')
    console.error('编辑Claude settings异常:', error)
  }
}

// 保存Claude settings.json
const saveClaudeSettings = async () => {
  if (!claudeSettingsContent.value.trim()) {
    showMessage('配置内容不能为空', 'error')
    return
  }

  // 验证JSON格式
  if (!jsonValid.value || jsonError.value) {
    showMessage('JSON格式错误，请修正后再保存', 'error')
    return
  }

  try {
    // 验证JSON格式
    const parsedContent = JSON.parse(claudeSettingsContent.value)

    savingClaudeSettings.value = true

    // 获取文件路径
    const pathResult = await window.api.getClaudeSettingsPath()
    if (!pathResult.success) {
      showMessage(`获取配置文件路径失败: ${pathResult.error}`, 'error')
      return
    }

    // 保存文件
    const saveResult = await window.api.writeFile(pathResult.data, parsedContent)
    if (saveResult.success) {
      showMessage('Claude settings.json 已保存', 'success')
      showClaudeSettingsDialog.value = false

      // 重新检测网络模式
      detectNetworkMode()

      // 更新悬浮窗
      updateFloatingWindowWithCurrentInfo()

      // 发送配置保存事件
      window.dispatchEvent(new CustomEvent('claude-config-saved'))
    } else {
      showMessage(`保存配置文件失败: ${saveResult.error}`, 'error')
    }
  } catch (err) {
    if (err instanceof SyntaxError) {
      showMessage('JSON格式错误，请检查配置内容', 'error')
      console.error('JSON解析错误:', err)
    } else {
      showMessage(`保存配置文件异常: ${err.message}`, 'error')
      console.error('保存Claude settings异常:', err)
    }
  } finally {
    savingClaudeSettings.value = false
  }
}

// 处理全局代理切换
const handleGlobalProxyChange = async (value) => {
  try {
    console.log('[App] 开始切换网络模式:', value ? '代理模式' : '直连模式')

    // 显示切换提示
    showMessage(`正在切换到${value ? '代理模式' : '直连模式'}...`, 'info')

    // 调用主进程进行网络模式切换
    const result = await window.api.switchNetworkMode(value)

    if (result.success) {
      // 切换成功，显示成功消息
      showMessage(`${result.message}`, 'success')

      // 重新检测网络模式以确保UI状态正确
      setTimeout(() => {
        detectNetworkMode()
      }, 500)

      // 更新悬浮窗状态
      updateFloatingWindowWithCurrentInfo()

      // 发送配置保存事件，触发相关组件更新
      window.dispatchEvent(new CustomEvent('claude-config-saved'))
    } else {
      // 切换失败，恢复开关状态
      useProxy.value = !value
      showMessage(`切换失败: ${result.error}`, 'error')
      console.error('[App] 网络模式切换失败:', result.error)
    }
  } catch (error) {
    // 异常处理，恢复开关状态
    useProxy.value = !value
    showMessage(`切换异常: ${error.message}`, 'error')
    console.error('[App] 网络模式切换异常:', error)
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 overflow-x-hidden">
    <!-- 头部区域 -->
    <div class="bg-white shadow-sm border-b border-gray-200 p-4 sm:p-6 sticky top-0 z-10">
      <div class="max-w-6xl mx-auto">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div class="flex items-center space-x-4">
            <img alt="logo" class="w-10 h-10 sm:w-12 sm:h-12" src="./assets/icon.svg" />
            <div>
              <h1 class="text-xl sm:text-2xl font-bold text-gray-900">Claude Code Router</h1>
              <p class="text-sm text-gray-600">管理面板</p>
            </div>
          </div>

          <!-- 顶部操作按钮 -->
          <div class="flex items-center space-x-3 w-full sm:w-auto">
            <!-- 网络连接模式切换 -->
            <div class="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-lg">
              <span class="text-sm text-gray-600">网络模式:</span>
              <el-switch
                v-model="useProxy"
                active-text="代理"
                inactive-text="直连"
                size="small"
                @change="handleGlobalProxyChange"
              />
              <span class="text-xs text-gray-500" title="基于Claude配置自动检测"> 自动检测 </span>
            </div>

            <!-- 仅在启动服务tab时只显示网络模式，其他tab显示对应按钮 -->
            <template v-if="activeTab !== 'service'">
              <el-button
                v-if="activeTab === 'config'"
                type="success"
                class="flex-1 sm:flex-none"
                @click="showAddProvider"
              >
                添加服务商
              </el-button>
              <el-button
                v-if="activeTab === 'config'"
                type="primary"
                :loading="isLoading"
                class="flex-1 sm:flex-none"
                @click="refreshConfig"
              >
                {{ isLoading ? '加载中...' : '刷新配置' }}
              </el-button>
              <el-button
                v-if="activeTab === 'config'"
                type="info"
                class="flex-1 sm:flex-none"
                @click="openConfigFolder"
              >
                打开CCR配置文件夹
              </el-button>
              <el-button
                v-if="activeTab === 'claude'"
                type="info"
                class="flex-1 sm:flex-none"
                @click="openClaudeConfigFolder"
              >
                打开Claude配置文件夹
              </el-button>
              <el-button
                v-if="activeTab === 'claude'"
                type="primary"
                class="flex-1 sm:flex-none"
                @click="editClaudeSettings"
              >
                编辑settings.json
              </el-button>
            </template>
          </div>
        </div>

        <!-- Tab导航 -->
        <div class="mt-4">
          <el-tabs v-model="activeTab" class="ccr-tabs">
            <el-tab-pane label="配置管理" name="config"></el-tab-pane>
            <el-tab-pane label="Claude配置" name="claude"></el-tab-pane>
            <el-tab-pane label="启动服务" name="service"></el-tab-pane>
            <el-tab-pane label="数据备份" name="backup"></el-tab-pane>
          </el-tabs>
        </div>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="max-w-6xl mx-auto p-4 sm:p-6 pb-8">
      <!-- 配置管理Tab内容 -->
      <div v-if="activeTab === 'config'">
        <MultiModelConfig
          v-if="configData"
          :providers="configData.Providers"
          :router="configData.Router"
          @save-model="saveRouterModel"
          @save-threshold="saveLongContextThreshold"
          @save-all="saveAllRouterConfig"
        />
        <ConfigTab
          :config-data="configData"
          :is-loading="isLoading"
          @refresh="refreshConfig"
          @save-default-model="saveDefaultModel"
          @provider-click="showProviderDetail"
        />
      </div>

      <!-- Claude配置Tab内容 -->
      <div v-if="activeTab === 'claude'">
        <ClaudeConfigTab />
      </div>

      <!-- 启动服务Tab内容 -->
      <div v-if="activeTab === 'service'">
        <ServiceTab
          :active-tab="activeTab"
          :is-service-running="isServiceRunning"
          @message="handleServiceMessage"
          @service-status-changed="handleServiceStatusChange"
        />
      </div>
      <!-- 数据备份Tab内容 -->
      <div v-if="activeTab === 'backup'">
        <BackupDataTab />
      </div>
    </div>

    <!-- Provider 详情弹窗 -->
    <el-dialog
      v-model="showProviderDialog"
      :title="`${selectedProvider?.name || ''} 详细配置`"
      :width="'90vw'"
      :style="{ 'max-width': '600px' }"
      :lock-scroll="false"
      append-to-body
      height="600px"
      @closed="closeProviderDialog"
    >
      <div v-if="selectedProvider" class="space-y-4 h-[500px] flex flex-col">
        <!-- 基本信息 -->
        <div class="bg-gray-50 rounded-lg p-4 flex-shrink-0">
          <h4 class="font-medium text-gray-900 mb-3">基本信息</h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">服务名称</label>
              <el-input v-model="selectedProvider.name" placeholder="请输入服务名称" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">API地址</label>
              <el-input v-model="selectedProvider.api_base_url" placeholder="请输入API地址" />
            </div>
          </div>
        </div>

        <!-- API Key配置 -->
        <div class="flex-shrink-0">
          <label class="block text-sm font-medium text-gray-700 mb-2">API Key</label>
          <el-input
            v-model="selectedProvider.api_key"
            type="password"
            placeholder="请输入API Key..."
            show-password
          />
        </div>

        <!-- 模型列表 -->
        <div class="flex-1 min-h-0 flex flex-col">
          <label class="block text-sm font-medium text-gray-700 mb-2">支持的模型</label>
          <div class="bg-gray-50 rounded-lg p-3 flex-1 min-h-0 overflow-y-auto mb-3">
            <div v-if="selectedProvider.models?.length" class="space-y-1">
              <div
                v-for="model in selectedProvider.models"
                :key="model"
                class="flex items-center justify-between bg-white rounded px-3 py-2"
              >
                <span class="text-sm font-mono break-all pr-2">{{ model }}</span>
                <el-button
                  type="danger"
                  size="small"
                  text
                  class="flex-shrink-0"
                  @click="removeModelFromProvider(model)"
                >
                  删除
                </el-button>
              </div>
            </div>
            <div v-else class="text-center text-gray-500 text-sm py-4">暂无配置模型</div>
          </div>
          <div class="flex gap-2 flex-shrink-0">
            <el-input
              v-model="newModelInput"
              placeholder="输入新模型名称"
              size="small"
              class="flex-1"
              @keyup.enter="addModelToProvider"
            />
            <el-button
              type="primary"
              size="small"
              class="flex-shrink-0"
              @click="addModelToProvider"
            >
              添加
            </el-button>
          </div>
        </div>

        <!-- 转换器配置 -->
        <div class="flex-shrink-0">
          <label class="block text-sm font-medium text-gray-700 mb-2">转换器配置</label>
          <el-input
            v-model="selectedProviderTransformerText"
            type="textarea"
            :rows="3"
            placeholder="请输入转换器配置 (JSON)，留空则不使用转换器"
          />
        </div>
      </div>

      <template #footer>
        <div class="flex justify-between">
          <el-button type="danger" class="mr-auto" @click="deleteProvider">删除服务</el-button>
          <div class="flex space-x-3">
            <el-button @click="closeProviderDialog">取消</el-button>
            <el-button type="primary" @click="saveProviderConfig">保存配置</el-button>
          </div>
        </div>
      </template>
    </el-dialog>

    <!-- 添加服务商弹窗 -->
    <el-dialog
      v-model="showAddProviderDialog"
      title="添加新服务商"
      :width="'90vw'"
      :style="{ 'max-width': '600px' }"
      :lock-scroll="false"
      append-to-body
      height="600px"
      @closed="closeAddProviderDialog"
    >
      <div class="space-y-4 h-[500px] flex flex-col">
        <!-- 基本信息 -->
        <div class="bg-gray-50 rounded-lg p-4 flex-shrink-0">
          <h4 class="font-medium text-gray-900 mb-3">基本信息</h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">服务商名称</label>
              <el-input v-model="newProvider.name" placeholder="请输入服务商名称" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">API地址</label>
              <el-input v-model="newProvider.api_base_url" placeholder="请输入API地址" />
            </div>
          </div>
        </div>

        <!-- API Key配置 -->
        <div class="flex-shrink-0">
          <label class="block text-sm font-medium text-gray-700 mb-2">API Key</label>
          <el-input
            v-model="newProvider.api_key"
            type="password"
            placeholder="请输入API Key..."
            show-password
          />
        </div>

        <!-- 模型列表 -->
        <div class="flex-1 min-h-0 flex flex-col">
          <label class="block text-sm font-medium text-gray-700 mb-2">支持的模型</label>
          <div class="bg-gray-50 rounded-lg p-3 flex-1 min-h-0 overflow-y-auto mb-3">
            <div v-if="newProvider.models?.length" class="space-y-1">
              <div
                v-for="model in newProvider.models"
                :key="model"
                class="flex items-center justify-between bg-white rounded px-3 py-2"
              >
                <span class="text-sm font-mono break-all pr-2">{{ model }}</span>
                <el-button
                  type="danger"
                  size="small"
                  text
                  class="flex-shrink-0"
                  @click="removeModelFromNewProvider(model)"
                >
                  删除
                </el-button>
              </div>
            </div>
            <div v-else class="text-center text-gray-500 text-sm py-4">暂无配置模型</div>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <el-input
              v-model="newModelInput"
              placeholder="输入新模型名称 (按回车添加)"
              class="flex-1"
              @keyup.enter="addModelToNewProvider"
            />
            <el-button
              type="primary"
              size="small"
              class="flex-shrink-0"
              @click="addModelToNewProvider"
            >
              添加
            </el-button>
          </div>
        </div>

        <!-- 转换器配置 -->
        <div class="flex-shrink-0">
          <label class="block text-sm font-medium text-gray-700 mb-2">转换器配置 (JSON)</label>
          <el-input
            v-model="newTransformerText"
            type="textarea"
            :rows="3"
            placeholder="请输入转换器配置 (JSON)，留空则不使用转换器"
          />
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end space-x-3">
          <el-button @click="closeAddProviderDialog">取消</el-button>
          <el-button type="primary" @click="saveNewProvider">保存配置</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 编辑Claude settings.json弹窗 -->
    <el-dialog
      v-model="showClaudeSettingsDialog"
      title="编辑Claude settings.json"
      width="90vw"
      :style="{ 'max-width': '800px' }"
      :lock-scroll="true"
      append-to-body
      :close-on-click-modal="false"
      class="claude-settings-dialog"
    >
      <div class="claude-settings-content">
        <div class="warning-section">
          <div class="flex items-start space-x-3">
            <svg
              class="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clip-rule="evenodd"
              />
            </svg>
            <div class="text-sm text-yellow-800">
              <p class="font-medium mb-1">注意事项</p>
              <ul class="list-disc list-inside space-y-1 text-xs">
                <li>此文件包含Claude桌面应用的核心配置，请谨慎修改</li>
                <li>修改后可能需要重启Claude应用才能生效</li>
                <li>请确保JSON格式正确，否则可能导致配置文件损坏</li>
                <li>建议在修改前备份原始配置文件</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="editor-section">
          <div class="flex items-center justify-between mb-2">
            <label class="block text-sm font-medium text-gray-700">settings.json 内容</label>
            <div class="flex items-center space-x-2">
              <el-button
                type="text"
                size="small"
                :disabled="!claudeSettingsContent.trim()"
                class="text-blue-600 hover:text-blue-800"
                @click="formatJson"
              >
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                格式化
              </el-button>
              <el-button
                type="text"
                size="small"
                :disabled="!claudeSettingsContent.trim()"
                class="text-green-600 hover:text-green-800"
                @click="validateJson"
              >
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                验证
              </el-button>
            </div>
          </div>

          <!-- JSON 编辑器 -->
          <div class="json-editor-container">
            <div
              ref="jsonEditor"
              class="json-editor"
              :class="{ 'json-error': jsonError, 'json-success': jsonValid }"
              contenteditable="true"
              spellcheck="false"
              @input="handleJsonInput"
              @paste="handleJsonPaste"
              @keydown="handleJsonKeydown"
            ></div>

            <!-- 错误提示 -->
            <div v-if="jsonError" class="json-error-message">
              <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clip-rule="evenodd"
                />
              </svg>
              {{ jsonError }}
            </div>

            <!-- 成功提示 -->
            <div v-if="jsonValid && !jsonError" class="json-success-message">
              <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clip-rule="evenodd"
                />
              </svg>
              JSON 格式正确
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end space-x-3">
          <el-button @click="showClaudeSettingsDialog = false">取消</el-button>
          <el-button type="primary" :loading="savingClaudeSettings" @click="saveClaudeSettings">
            {{ savingClaudeSettings ? '保存中...' : '保存' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.logo {
  transition: filter 0.3s ease;
}

.logo:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}

/* Tab样式优化 */
:deep(.ccr-tabs .el-tabs__header) {
  margin: 0;
  border-bottom: 1px solid #e5e7eb;
}

:deep(.ccr-tabs .el-tabs__nav-wrap::after) {
  display: none;
}

:deep(.ccr-tabs .el-tabs__item) {
  color: #6b7280;
  font-weight: 500;
}

:deep(.ccr-tabs .el-tabs__item.is-active) {
  color: #3b82f6;
}

:deep(.ccr-tabs .el-tabs__active-bar) {
  background-color: #3b82f6;
}

/* Claude settings dialog specific styles */
:deep(.claude-settings-dialog) {
  overflow: hidden;
}

:deep(.claude-settings-dialog .el-dialog) {
  margin: 0 auto;
  overflow: hidden;
}

:deep(.claude-settings-dialog .el-dialog__body) {
  padding: 20px;
  overflow: hidden;
}

.claude-settings-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 70vh;
  overflow: hidden;
}

.warning-section {
  flex-shrink: 0;
}

.editor-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

:deep(.claude-settings-textarea) {
  height: 100%;
  min-height: 400px;
}

/* JSON 编辑器样式 */
.json-editor-container {
  position: relative;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  overflow: hidden;
  transition: border-color 0.2s ease;
}

.json-editor-container:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.json-editor {
  min-height: 400px;
  max-height: 500px;
  overflow-y: auto;
  padding: 16px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  background: #f8fafc;
  color: #374151;
  white-space: pre-wrap;
  outline: none;
  tab-size: 2;
}

.json-editor.json-error {
  border-color: #ef4444;
  background: #fef2f2;
}

.json-editor.json-success {
  border-color: #10b981;
  background: #f0fdf4;
}

.json-editor .json-placeholder {
  color: #9ca3af;
  font-style: italic;
}

.json-editor .json-key {
  color: #dc2626;
  font-weight: 600;
}

.json-editor .json-string {
  color: #059669;
}

.json-editor .json-number {
  color: #2563eb;
}

.json-editor .json-boolean {
  color: #7c3aed;
  font-weight: 600;
}

.json-editor .json-bracket {
  color: #6b7280;
  font-weight: 500;
}

.json-error-message {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fee2e2;
  color: #dc2626;
  padding: 8px 12px;
  font-size: 12px;
  display: flex;
  align-items: center;
  border-top: 1px solid #fecaca;
}

.json-success-message {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #dcfce7;
  color: #16a34a;
  padding: 8px 12px;
  font-size: 12px;
  display: flex;
  align-items: center;
  border-top: 1px solid #bbf7d0;
}

/* 滚动条样式 */
.json-editor::-webkit-scrollbar {
  width: 8px;
}

.json-editor::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.json-editor::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.json-editor::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
