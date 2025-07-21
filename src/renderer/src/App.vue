<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

// 响应式数据
const configData = ref(null)
const isLoading = ref(false)
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

// 自动加载配置
onMounted(() => {
  loadConfig()
})

// 加载配置文件
const loadConfig = async () => {
  isLoading.value = true

  try {
    const result = await window.api.readSettings()

    if (result.success) {
      configData.value = result.data
      ElMessage.success('配置加载成功')
    } else {
      configData.value = null
      ElMessage.error('配置文件加载失败')
      console.warn('配置加载失败:', result.error)
    }
  } catch (error) {
    configData.value = null
    ElMessage.error(`配置加载异常: ${error.message}`)
    console.error('配置加载异常:', error)
  } finally {
    isLoading.value = false
  }
}

// 刷新配置
const refreshConfig = () => {
  ElMessage.info('正在刷新配置...')
  loadConfig()
}

// 显示Provider详情
const showProviderDetail = (provider) => {
  selectedProvider.value = { ...provider }
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

// 保存Provider配置
const saveProviderConfig = () => {
  // TODO: 实现保存功能
  ElMessage.success('保存功能待实现')
  closeProviderDialog()
}

// 保存新Provider
const saveNewProvider = () => {
  // 验证必填字段
  if (!newProvider.value.name.trim()) {
    ElMessage.error('请输入服务商名称')
    return
  }
  if (!newProvider.value.api_base_url.trim()) {
    ElMessage.error('请输入API地址')
    return
  }

  // 解析transformer JSON
  if (newTransformerText.value.trim()) {
    try {
      newProvider.value.transformer = JSON.parse(newTransformerText.value)
    } catch {
      ElMessage.error('Transformer JSON格式错误')
      return
    }
  }

  // TODO: 实现添加新Provider的保存功能
  ElMessage.success('新增服务商功能待实现')
  console.log('新Provider数据:', newProvider.value)
  closeAddProviderDialog()
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
    <!-- 头部区域 -->
    <div class="bg-white shadow-sm border-b border-gray-200 p-6">
      <div class="max-w-6xl mx-auto">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <img alt="logo" class="w-12 h-12" src="./assets/electron.svg" />
            <div>
              <h1 class="text-2xl font-bold text-gray-900">Claude Code Router</h1>
              <p class="text-sm text-gray-600">配置管理面板</p>
            </div>
          </div>

          <div class="flex items-center space-x-3">
            <el-button type="success" @click="showAddProvider"> 添加服务商 </el-button>
            <el-button type="primary" :loading="isLoading" @click="refreshConfig">
              {{ isLoading ? '加载中...' : '刷新配置' }}
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="max-w-6xl mx-auto p-6">
      <!-- 加载状态 -->
      <div v-if="isLoading" class="flex-center py-20">
        <div class="text-center">
          <div
            class="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
          ></div>
          <p class="text-gray-600">正在加载配置文件...</p>
        </div>
      </div>

      <!-- 配置文件不存在 -->
      <div v-else-if="!configData" class="text-center py-20">
        <div class="bg-white rounded-lg shadow-md p-8 max-w-md mx-auto">
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
          <p class="text-gray-600 mb-6">
            请创建配置文件
            <code class="bg-gray-100 px-2 py-1 rounded text-sm"
              >~/.cluade-code-router/setting.json</code
            >
          </p>
          <el-button type="primary" @click="refreshConfig">重新检查</el-button>
        </div>
      </div>

      <!-- Provider 卡片列表 -->
      <div v-else>
        <!-- 统计信息 -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex items-center">
              <div class="w-12 h-12 bg-blue-500 rounded-lg flex-center">
                <svg
                  class="w-6 h-6 text-white"
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
              <div class="ml-4">
                <p class="text-2xl font-bold text-gray-900">
                  {{ configData.Providers?.length || 0 }}
                </p>
                <p class="text-sm text-gray-600">服务提供商</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex items-center">
              <div class="w-12 h-12 bg-green-500 rounded-lg flex-center">
                <svg
                  class="w-6 h-6 text-white"
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
              <div class="ml-4">
                <p class="text-2xl font-bold text-gray-900">
                  {{
                    configData.Providers?.filter((p) => p.api_key && p.api_key.trim() !== '')
                      .length || 0
                  }}
                </p>
                <p class="text-sm text-gray-600">已配置Key</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex items-center">
              <div class="w-12 h-12 bg-purple-500 rounded-lg flex-center">
                <svg
                  class="w-6 h-6 text-white"
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
              <div class="ml-4">
                <p class="text-2xl font-bold text-gray-900">
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
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="provider in configData.Providers"
            :key="provider.name"
            class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer"
            @click="showProviderDetail(provider)"
          >
            <div class="p-6">
              <!-- 头部：名称和状态 -->
              <div class="flex items-start justify-between mb-4">
                <div>
                  <h3 class="text-lg font-semibold text-gray-900 mb-1">{{ provider.name }}</h3>
                  <p class="text-sm text-gray-500">{{ formatUrl(provider.api_base_url) }}</p>
                </div>
                <el-tag :type="getProviderStatus(provider).status" size="small">
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
                    class="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
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
      width="600px"
      :lock-scroll="false"
      @closed="closeProviderDialog"
    >
      <div v-if="selectedProvider" class="space-y-4">
        <!-- 基本信息 -->
        <div class="bg-gray-50 rounded-lg p-4">
          <h4 class="font-medium text-gray-900 mb-3">基本信息</h4>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-gray-600">服务名称:</span>
              <span class="ml-2 font-medium">{{ selectedProvider.name }}</span>
            </div>
            <div>
              <span class="text-gray-600">API地址:</span>
              <span class="ml-2 font-mono text-xs">{{ selectedProvider.api_base_url }}</span>
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
                class="flex items-center justify-between bg-white rounded px-3 py-2"
              >
                <span class="text-sm font-mono">{{ model }}</span>
                <el-button type="danger" size="small" text @click="removeModelFromProvider(model)"
                  >删除</el-button
                >
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
            />
            <el-button type="primary" size="small" @click="addModelToProvider">添加</el-button>
          </div>
        </div>

        <!-- 转换器配置 -->
        <div v-if="selectedProvider.transformer">
          <label class="block text-sm font-medium text-gray-700 mb-2">转换器配置</label>
          <pre class="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-auto">{{
            JSON.stringify(selectedProvider.transformer, null, 2)
          }}</pre>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end space-x-3">
          <el-button @click="closeProviderDialog">取消</el-button>
          <el-button type="primary" @click="saveProviderConfig">保存配置</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 添加服务商弹窗 -->
    <el-dialog
      v-model="showAddProviderDialog"
      title="添加新服务商"
      width="600px"
      :lock-scroll="false"
      @closed="closeAddProviderDialog"
    >
      <div class="space-y-4">
        <!-- 基本信息 -->
        <div class="bg-gray-50 rounded-lg p-4">
          <h4 class="font-medium text-gray-900 mb-3">基本信息</h4>
          <div class="grid grid-cols-2 gap-4 text-sm">
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
                class="flex items-center justify-between bg-white rounded px-3 py-2"
              >
                <span class="text-sm font-mono">{{ model }}</span>
                <el-button
                  type="danger"
                  size="small"
                  text
                  @click="removeModelFromNewProvider(model)"
                  >删除</el-button
                >
              </div>
            </div>
            <div v-else class="text-center text-gray-500 text-sm py-4">暂无配置模型</div>
          </div>
          <div class="flex items-center mt-2">
            <el-input
              v-model="newModelInput"
              placeholder="输入新模型名称 (按回车添加)"
              @keyup.enter="addModelToNewProvider"
            />
            <el-button type="primary" size="small" @click="addModelToNewProvider">添加</el-button>
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
