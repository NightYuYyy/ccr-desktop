<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// 统一消息管理函数 - 确保同时只显示一条消息
const showMessage = (message, type = 'info') => {
  ElMessage.closeAll() // 关闭所有现有消息
  return ElMessage[type](message)
}

// 响应式数据
const configData = ref(null)
const isLoading = ref(false)
const configPaths = ref(null)
const selectedProvider = ref(null)
const showProviderDialog = ref(false)
const showAddProviderDialog = ref(false)
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
  loadConfig()
  loadConfigPaths()
})

// 加载配置文件
const loadConfig = async () => {
  isLoading.value = true

  try {
    const result = await window.api.readSettings()

    if (result.success) {
      configData.value = result.data
      showMessage('配置加载成功', 'success')
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

// 打开配置文件夹
const openConfigFolder = async () => {
  try {
    const result = await window.api.openConfigFolder()
    if (result.success) {
      showMessage('配置文件夹已打开', 'success')
    } else {
      showMessage(`打开配置文件夹失败: ${result.error}`, 'error')
    }
  } catch (error) {
    showMessage(`打开配置文件夹异常: ${error.message}`, 'error')
    console.error('打开配置文件夹异常:', error)
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

// 获取Provider状态
const getProviderStatus = (provider) => {
  if (!provider.api_key || provider.api_key.trim() === '') {
    return { status: 'warning', text: '未配置Key' }
  }
  return { status: 'success', text: '已配置' }
}

// 格式化URL显示
const formatUrl = (url) => {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
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

    // 从配置数据中移除该Provider
    if (configData.value?.Providers) {
      const index = configData.value.Providers.findIndex(p => p.name === selectedProvider.value.name)
      if (index > -1) {
        const providerName = selectedProvider.value.name
        configData.value.Providers.splice(index, 1)

        try {
          // 保存到文件
          const result = await window.api.saveSettings(configData.value)

          if (result.success) {
            showMessage(`服务商 "${providerName}" 已删除`, 'success')
            closeProviderDialog()
          } else {
            // 保存失败，恢复数据
            configData.value.Providers.splice(index, 0, selectedProvider.value)
            showMessage(`删除失败: ${result.error}`, 'error')
          }
        } catch (error) {
          // 保存异常，恢复数据
          configData.value.Providers.splice(index, 0, selectedProvider.value)
          showMessage(`删除异常: ${error.message}`, 'error')
          console.error('删除配置异常:', error)
        }
      } else {
        showMessage('找不到要删除的服务商', 'error')
      }
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
    selectedProvider.value.transformer = null
  }

  try {
    // 更新配置数据中的Provider
    if (configData.value?.Providers) {
      const index = configData.value.Providers.findIndex(p => p.name === selectedProvider.value.name)
      if (index > -1) {
        configData.value.Providers[index] = { ...selectedProvider.value }
      }
    }

    // 保存到文件
    const result = await window.api.saveSettings(configData.value)

    if (result.success) {
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
  }

  try {
    // 检查服务商名称是否已存在
    if (configData.value?.Providers?.some(p => p.name === newProvider.value.name)) {
      showMessage('服务商名称已存在，请使用不同的名称', 'error')
      return
    }

    // 添加到配置数据
    if (!configData.value) {
      configData.value = { LOG: false, Providers: [], Router: { default: '' } }
    }
    if (!configData.value.Providers) {
      configData.value.Providers = []
    }

    configData.value.Providers.push({ ...newProvider.value })

    // 保存到文件
    const result = await window.api.saveSettings(configData.value)

    if (result.success) {
      showMessage(`服务商 "${newProvider.value.name}" 已添加`, 'success')
      closeAddProviderDialog()
    } else {
      // 保存失败，移除刚添加的Provider
      configData.value.Providers.pop()
      showMessage(`添加失败: ${result.error}`, 'error')
    }
  } catch (error) {
    // 保存异常，移除刚添加的Provider
    if (configData.value?.Providers?.length) {
      configData.value.Providers.pop()
    }
    showMessage(`添加异常: ${error.message}`, 'error')
    console.error('添加配置异常:', error)
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
            <img alt="logo" class="w-10 h-10 sm:w-12 sm:h-12" src="./assets/electron.svg" />
            <div>
              <h1 class="text-xl sm:text-2xl font-bold text-gray-900">Claude Code Router</h1>
              <div class="flex items-center gap-2">
                <p class="text-sm text-gray-600">配置管理面板</p>
                <span v-if="configPaths" class="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                  {{ configPaths.configDir }}
                </span>
              </div>
            </div>
          </div>

          <div class="flex items-center space-x-3 w-full sm:w-auto">
            <el-button type="success" @click="showAddProvider" class="flex-1 sm:flex-none">
              添加服务商
            </el-button>
            <el-button type="primary" :loading="isLoading" @click="refreshConfig" class="flex-1 sm:flex-none">
              {{ isLoading ? '加载中...' : '刷新配置' }}
            </el-button>
            <el-button type="info" @click="openConfigFolder" class="flex-1 sm:flex-none">
              打开配置文件夹
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="max-w-6xl mx-auto p-4 sm:p-6 pb-8">
      <!-- 加载状态 -->
      <div v-if="isLoading" class="flex justify-center items-center py-20">
        <div class="text-center">
          <div
            class="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
          ></div>
          <p class="text-gray-600">正在加载配置文件...</p>
        </div>
      </div>

      <!-- 配置文件不存在 -->
      <div v-else-if="!configData" class="text-center py-20">
        <div class="bg-white rounded-lg shadow-md p-6 sm:p-8 max-w-md mx-auto">
          <div class="text-gray-400 mb-4">
            <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-800 mb-2">配置文件不存在</h3>
          <p class="text-gray-600 mb-6 text-sm sm:text-base">
            请创建配置文件
            <code class="bg-gray-100 px-2 py-1 rounded text-sm break-all"
              >~/.cluade-code-router/setting.json</code
            >
          </p>
          <el-button type="primary" @click="refreshConfig">重新检查</el-button>
        </div>
      </div>

      <!-- Provider 卡片列表 -->
      <div v-else>
        <!-- 统计信息 -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div class="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <div class="flex items-center">
              <div class="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 rounded-lg flex justify-center items-center">
                <svg
                  class="w-5 h-5 sm:w-6 sm:h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <div class="ml-3 sm:ml-4">
                <p class="text-xl sm:text-2xl font-bold text-gray-900">
                  {{ configData.Providers?.length || 0 }}
                </p>
                <p class="text-sm text-gray-600">服务提供商</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <div class="flex items-center">
              <div class="w-10 h-10 sm:w-12 sm:h-12 bg-green-500 rounded-lg flex justify-center items-center">
                <svg
                  class="w-5 h-5 sm:w-6 sm:h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div class="ml-3 sm:ml-4">
                <p class="text-xl sm:text-2xl font-bold text-gray-900">
                  {{
                    configData.Providers?.filter((p) => p.api_key && p.api_key.trim() !== '')
                      .length || 0
                  }}
                </p>
                <p class="text-sm text-gray-600">已配置Key</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow-md p-4 sm:p-6 sm:col-span-2 lg:col-span-1">
            <div class="flex items-center">
              <div class="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500 rounded-lg flex justify-center items-center">
                <svg
                  class="w-5 h-5 sm:w-6 sm:h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <div class="ml-3 sm:ml-4">
                <p class="text-xl sm:text-2xl font-bold text-gray-900">
                  {{
                    configData.Providers?.reduce((sum, p) => sum + (p.models?.length || 0), 0) || 0
                  }}
                </p>
                <p class="text-sm text-gray-600">可用模型</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Provider 卡片网格 -->
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          <div
            v-for="provider in configData.Providers"
            :key="provider.name"
            class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer"
            @click="showProviderDetail(provider)"
          >
            <div class="p-4 sm:p-6">
              <!-- 头部：名称和状态 -->
              <div class="flex items-start justify-between mb-4">
                <div class="min-w-0 flex-1 mr-3">
                  <h3 class="text-base sm:text-lg font-semibold text-gray-900 mb-1 truncate">{{ provider.name }}</h3>
                  <p class="text-sm text-gray-500 truncate">{{ formatUrl(provider.api_base_url) }}</p>
                </div>
                <el-tag :type="getProviderStatus(provider).status" size="small" class="flex-shrink-0">
                  {{ getProviderStatus(provider).text }}
                </el-tag>
              </div>

              <!-- 模型信息 -->
              <div class="mb-4">
                <p class="text-sm text-gray-600 mb-2">
                  可用模型 ({{ provider.models?.length || 0 }})
                </p>
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="model in (provider.models || []).slice(0, 3)"
                    :key="model"
                    class="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded truncate max-w-full"
                    :title="model"
                  >
                    {{ model }}
                  </span>
                  <span
                    v-if="(provider.models?.length || 0) > 3"
                    class="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                  >
                    +{{ (provider.models?.length || 0) - 3 }}
                  </span>
                </div>
              </div>

              <!-- 操作区域 -->
              <div class="flex items-center justify-between pt-4 border-t border-gray-100">
                <div class="flex items-center text-sm text-gray-500">
                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                  查看详情
                </div>
                <div class="flex items-center space-x-1">
                  <div
                    v-if="provider.transformer"
                    class="w-2 h-2 bg-blue-500 rounded-full"
                    title="已配置转换器"
                  ></div>
                  <div
                    v-if="configData.Router?.default?.includes(provider.name)"
                    class="w-2 h-2 bg-green-500 rounded-full"
                    title="默认路由"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Provider 详情弹窗 -->
    <el-dialog
      v-model="showProviderDialog"
      :title="`${selectedProvider?.name || ''} 详细配置`"
      :width="'90vw'"
      :style="{ 'max-width': '600px' }"
      :lock-scroll="false"
      @closed="closeProviderDialog"
      append-to-body
    >
      <div v-if="selectedProvider" class="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        <!-- 基本信息 -->
        <div class="bg-gray-50 rounded-lg p-4">
          <h4 class="font-medium text-gray-900 mb-3">基本信息</h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-gray-600">服务名称:</span>
              <span class="ml-2 font-medium break-all">{{ selectedProvider.name }}</span>
            </div>
            <div>
              <span class="text-gray-600">API地址:</span>
              <span class="ml-2 font-mono text-xs break-all">{{ selectedProvider.api_base_url }}</span>
            </div>
          </div>
        </div>

        <!-- API Key配置 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">API Key</label>
          <el-input
            v-model="selectedProvider.api_key"
            type="password"
            placeholder="请输入API Key..."
            show-password
          />
        </div>

        <!-- 模型列表 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">支持的模型</label>
          <div class="bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto">
            <div v-if="selectedProvider.models?.length" class="space-y-1">
              <div
                v-for="model in selectedProvider.models"
                :key="model"
                class="flex items-center justify-between rounded px-3 py-2"
              >
                <span class="text-sm font-mono break-all pr-2">{{ model }}</span>
                <el-button
                  type="danger"
                  size="small"
                  text
                  @click="removeModelFromProvider(model)"
                  class="flex-shrink-0"
                >
                  删除
                </el-button>
              </div>
            </div>
            <div v-else class="text-center text-gray-500 text-sm py-4">暂无配置模型</div>
          </div>
          <div class="flex gap-2 mt-3">
            <el-input
              v-model="newModelInput"
              placeholder="输入新模型名称"
              @keyup.enter="addModelToProvider"
              size="small"
              class="flex-1"
            />
            <el-button type="primary" size="small" @click="addModelToProvider" class="flex-shrink-0">
              添加
            </el-button>
          </div>
        </div>

        <!-- 转换器配置 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">转换器配置</label>
          <el-input
            v-model="selectedProviderTransformerText"
            type="textarea"
            :rows="6"
            placeholder="请输入转换器配置 (JSON)，留空则不使用转换器"
          />
        </div>
      </div>

      <template #footer>
        <div class="flex justify-between">
          <el-button type="danger" @click="deleteProvider" class="mr-auto">删除服务</el-button>
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
      @closed="closeAddProviderDialog"
      append-to-body
    >
      <div class="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        <!-- 基本信息 -->
        <div class="bg-gray-50 rounded-lg p-4">
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
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">API Key</label>
          <el-input
            v-model="newProvider.api_key"
            type="password"
            placeholder="请输入API Key..."
            show-password
          />
        </div>

        <!-- 模型列表 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">支持的模型</label>
          <div class="bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto">
            <div v-if="newProvider.models?.length" class="space-y-1">
              <div
                v-for="model in newProvider.models"
                :key="model"
                class="flex items-center justify-between rounded px-3 py-2"
              >
                <span class="text-sm font-mono break-all pr-2">{{ model }}</span>
                <el-button
                  type="danger"
                  size="small"
                  text
                  @click="removeModelFromNewProvider(model)"
                  class="flex-shrink-0"
                >
                  删除
                </el-button>
              </div>
            </div>
            <div v-else class="text-center text-gray-500 text-sm py-4">暂无配置模型</div>
          </div>
          <div class="flex items-center mt-2 gap-2">
            <el-input
              v-model="newModelInput"
              placeholder="输入新模型名称 (按回车添加)"
              @keyup.enter="addModelToNewProvider"
              class="flex-1"
            />
            <el-button type="primary" size="small" @click="addModelToNewProvider" class="flex-shrink-0">
              添加
            </el-button>
          </div>
        </div>

        <!-- 转换器配置 -->
        <div>
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
  </div>
</template>

<style scoped>
.logo {
  transition: filter 0.3s ease;
}

.logo:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
