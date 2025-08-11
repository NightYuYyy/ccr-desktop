<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-xl font-semibold text-gray-900">直连配置管理</h2>
      <el-button type="primary" :loading="loading" @click="showAddConfigDialog">
        添加配置
      </el-button>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="flex justify-center items-center py-10">
      <div class="text-center">
        <div
          class="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
        ></div>
        <p class="text-gray-600">正在加载配置...</p>
      </div>
    </div>

    <!-- 配置列表 -->
    <div v-else>
      <!-- 搜索框 -->
      <div class="mb-6">
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              class="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="搜索配置名称、API Key、Base URL..."
            class="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
          />
          <button
            v-if="searchKeyword"
            @click="searchKeyword = ''"
            class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredConfigs.length === 0" class="text-center py-12">
        <div class="text-gray-400 mb-4">
          <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">
          {{ searchKeyword ? '未找到匹配的配置' : '暂无直连配置' }}
        </h3>
        <p class="text-gray-500 mb-4">
          {{ searchKeyword ? '请尝试其他搜索关键词' : '创建第一个直连配置来开始使用' }}
        </p>
        <el-button v-if="!searchKeyword" type="primary" @click="showAddConfigDialog"
          >添加配置</el-button
        >
      </div>

      <!-- 配置卡片网格 -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="config in filteredConfigs"
          :key="config.id"
          draggable="true"
          @dragstart="handleDragStart($event, config)"
          @dragover.prevent="handleDragOver($event)"
          @dragenter.prevent="handleDragEnter($event, config)"
          @dragleave.prevent="handleDragLeave($event)"
          @drop="handleDrop($event, config)"
          @dragend="handleDragEnd($event)"
          :class="[
            'border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all cursor-move relative',
            dragItem?.id === config.id ? 'opacity-50' : '',
            dragOverItem?.id === config.id ? 'ring-2 ring-blue-500 border-blue-500' : ''
          ]"
        >
          <!-- 拖拽手柄 -->
          <div class="absolute top-2 left-2 text-gray-400 hover:text-gray-600 transition-colors">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path
                d="M7 19h2c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2v2zm10 0h2v-2c-1.1 0-2 .9-2 2zm-10-4h2v-2H7v2zm10 0h2v-2h-2v2zM7 11h2V9H7v2zm10 0h2V9h-2v2zM7 7h2V5H7v2zm10 0h2V5h-2v2z"
              />
            </svg>
          </div>
          <!-- 配置头部 -->
          <div class="flex items-start justify-between mb-3 card-content">
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <h3 class="font-medium text-gray-900">{{ config.name }}</h3>
                <el-tag v-if="config.isDefault" type="success" size="small">默认</el-tag>
              </div>
              <p class="text-sm text-gray-500 mt-1 break-all">{{ config.baseUrl }}</p>
            </div>
            <el-dropdown @command="(cmd) => handleConfigAction(cmd, config)">
              <el-button type="text" size="small">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"
                  />
                </svg>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="edit">编辑</el-dropdown-item>
                  <el-dropdown-item command="copy">复制</el-dropdown-item>
                  <el-dropdown-item command="setDefault" :disabled="config.isDefault"
                    >设为默认</el-dropdown-item
                  >
                  <el-dropdown-item command="apply">应用到Claude</el-dropdown-item>
                  <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>

          <!-- API Key显示 -->
          <div class="mb-3 card-content">
            <label class="block text-xs text-gray-500 mb-1">API Key</label>
            <div class="flex items-center gap-2">
              <code class="text-xs bg-gray-500 px-2 py-1 rounded flex-1 truncate">
                {{ showApiKey[config.id] ? config.apiKey : maskApiKey(config.apiKey) }}
              </code>
              <el-button type="text" size="small" @click="toggleApiKeyVisibility(config.id)">
                <svg
                  v-if="showApiKey[config.id]"
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                  />
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              </el-button>
            </div>
          </div>

          <!-- 创建时间 -->
          <div class="text-xs text-gray-400 card-content">
            创建于 {{ formatDate(config.createdAt) }}
          </div>
        </div>
      </div>
    </div>

    <!-- 添加/编辑配置弹窗 -->
    <el-dialog
      v-model="showConfigDialog"
      :title="dialogTitle"
      width="500px"
      @closed="handleDialogClosed"
    >
      <el-form
        ref="configFormRef"
        :model="configForm"
        :rules="configRules"
        label-width="100px"
        label-position="left"
      >
        <el-form-item label="配置名称" prop="name">
          <el-input v-model="configForm.name" placeholder="请输入配置名称" />
        </el-form-item>

        <el-form-item label="API Key" prop="apiKey">
          <el-input
            v-model="configForm.apiKey"
            type="password"
            placeholder="请输入API Key"
            show-password
          />
        </el-form-item>

        <el-form-item label="Base URL" prop="baseUrl">
          <el-input v-model="configForm.baseUrl" placeholder="请输入API基础地址" />
        </el-form-item>

        <el-form-item>
          <el-checkbox v-model="configForm.isDefault">设为默认配置</el-checkbox>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="flex justify-end space-x-3">
          <el-button @click="showConfigDialog = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="saveConfig">
            {{ editingConfig ? '更新' : '添加' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// 简单的ID生成函数
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// 响应式数据
const loading = ref(false)
const saving = ref(false)
const directConfigs = ref([])
const showConfigDialog = ref(false)
const editingConfig = ref(null)
const showApiKey = reactive({})
const searchKeyword = ref('')
const dragItem = ref(null)
const dragOverItem = ref(null)

// 配置表单
const configForm = reactive({
  name: '',
  apiKey: '',
  baseUrl: 'https://api.anthropic.com',
  isDefault: false
})

// 验证配置名称唯一性
const validateNameUnique = (rule, value, callback) => {
  if (!value) {
    callback()
    return
  }

  const existingConfig = directConfigs.value.find(
    (config) => config.name === value && config.id !== editingConfig.value?.id
  )

  if (existingConfig) {
    callback(new Error('配置名称已存在，请使用其他名称'))
  } else {
    callback()
  }
}

// 表单验证规则
const configRules = {
  name: [
    { required: true, message: '请输入配置名称', trigger: 'blur' },
    { validator: validateNameUnique, trigger: 'blur' }
  ],
  apiKey: [{ required: true, message: '请输入API Key', trigger: 'blur' }],
  baseUrl: [
    { required: true, message: '请输入API基础地址', trigger: 'blur' },
    { type: 'url', message: '请输入正确的URL格式', trigger: 'blur' }
  ]
}

const configFormRef = ref()
const dialogTitle = ref('添加配置')

// 搜索过滤后的配置列表
const filteredConfigs = computed(() => {
  if (!searchKeyword.value.trim()) {
    return directConfigs.value
  }

  const keyword = searchKeyword.value.toLowerCase().trim()
  return directConfigs.value.filter((config) => {
    return (
      config.name.toLowerCase().includes(keyword) ||
      config.apiKey.toLowerCase().includes(keyword) ||
      config.baseUrl.toLowerCase().includes(keyword)
    )
  })
})

// 加载直连配置
const loadDirectConfig = async () => {
  loading.value = true
  try {
    const result = await window.api.readDirectConfig()

    if (result.success) {
      directConfigs.value = result.data.directConfigs || []

      // 为没有order字段的配置添加默认排序
      directConfigs.value.forEach((config, index) => {
        if (config.order === undefined) {
          config.order = index
        }
      })

      // 按order字段排序
      directConfigs.value.sort((a, b) => (a.order || 0) - (b.order || 0))

      if (result.isDefault) {
        ElMessage.info('使用默认配置，暂无保存的直连配置')
      }
    } else {
      ElMessage.error(`加载配置失败: ${result.error}`)
      directConfigs.value = []
    }
  } catch (error) {
    ElMessage.error(`加载配置异常: ${error.message}`)
    console.error('加载直连配置异常:', error)
  } finally {
    loading.value = false
  }
}

// 保存直连配置
const saveDirectConfig = async () => {
  try {
    // {{ AURA-X: Modify - 优化数据结构，使用defaultConfig字段替代isDefault. Approval: 寸止确认. }}
    // 深度克隆以确保所有数据都是可序列化的
    const configData = {
      version: '1.0',
      directConfigs: JSON.parse(JSON.stringify(directConfigs.value)),
      settings: {
        // 使用defaultConfig字段指定默认配置名称，而不是在每个配置中使用isDefault
        defaultConfig: directConfigs.value.find((c) => c.isDefault)?.name || ''
      }
    }

    const result = await window.api.saveDirectConfig(configData)

    if (result.success) {
      return true
    } else {
      ElMessage.error(`保存配置失败: ${result.error}`)
      return false
    }
  } catch (error) {
    ElMessage.error(`保存配置异常: ${error.message}`)
    console.error('保存直连配置异常:', error)
    return false
  }
}

// 显示添加配置弹窗
const showAddConfigDialog = () => {
  editingConfig.value = null
  dialogTitle.value = '添加配置'
  resetConfigForm()
  showConfigDialog.value = true
}

// 重置配置表单
const resetConfigForm = () => {
  configForm.name = ''
  configForm.apiKey = ''
  configForm.baseUrl = 'https://api.anthropic.com'
  configForm.isDefault = false

  if (configFormRef.value) {
    configFormRef.value.resetFields()
  }
}

// 处理弹窗关闭
const handleDialogClosed = () => {
  // 只有在编辑模式下才清空表单，新增模式保持原样
  if (editingConfig.value) {
    resetConfigForm()
    editingConfig.value = null
    dialogTitle.value = '添加配置'
  }
}

// 保存配置
const saveConfig = async () => {
  if (!configFormRef.value) return

  try {
    await configFormRef.value.validate()
  } catch {
    return
  }

  saving.value = true

  try {
    const now = new Date().toISOString()

    if (editingConfig.value) {
      // 编辑现有配置
      const index = directConfigs.value.findIndex((c) => c.id === editingConfig.value.id)
      if (index > -1) {
        directConfigs.value[index] = {
          ...directConfigs.value[index],
          name: configForm.name,
          apiKey: configForm.apiKey,
          baseUrl: configForm.baseUrl,
          isDefault: configForm.isDefault
        }
      }
    } else {
      // 添加新配置
      const newConfig = {
        id: generateId(),
        name: configForm.name,
        apiKey: configForm.apiKey,
        baseUrl: configForm.baseUrl,
        isDefault: configForm.isDefault,
        order: directConfigs.value.length, // 添加到末尾
        createdAt: now
      }

      directConfigs.value.push(newConfig)
    }

    // 如果设置为默认，清除其他默认配置
    if (configForm.isDefault) {
      directConfigs.value.forEach((config) => {
        if (
          config.id !==
          (editingConfig.value?.id || directConfigs.value[directConfigs.value.length - 1].id)
        ) {
          config.isDefault = false
        }
      })
    }

    // 保存到文件
    const success = await saveDirectConfig()
    if (success) {
      ElMessage.success(editingConfig.value ? '配置更新成功' : '配置添加成功')
      showConfigDialog.value = false
    }
  } catch (error) {
    ElMessage.error(`操作失败: ${error.message}`)
    console.error('保存配置异常:', error)
  } finally {
    saving.value = false
  }
}

// 处理配置操作
const handleConfigAction = async (command, config) => {
  switch (command) {
    case 'edit':
      editConfig(config)
      break
    case 'copy':
      copyConfig(config)
      break
    case 'setDefault':
      await setDefaultConfig(config)
      break
    case 'apply':
      await applyConfig(config)
      break
    case 'delete':
      await deleteConfig(config)
      break
  }
}

// 编辑配置
const editConfig = (config) => {
  editingConfig.value = config
  dialogTitle.value = '编辑配置'
  configForm.name = config.name
  configForm.apiKey = config.apiKey
  configForm.baseUrl = config.baseUrl
  configForm.isDefault = config.isDefault
  showConfigDialog.value = true
}

// 复制配置
const copyConfig = (config) => {
  editingConfig.value = null
  dialogTitle.value = '复制配置'
  configForm.name = `${config.name} - 副本`
  configForm.apiKey = config.apiKey
  configForm.baseUrl = config.baseUrl
  configForm.isDefault = false
  showConfigDialog.value = true
}

// 设置默认配置
const setDefaultConfig = async (config) => {
  try {
    // 清除所有默认标记
    directConfigs.value.forEach((c) => (c.isDefault = false))
    // 设置当前配置为默认
    config.isDefault = true

    const success = await saveDirectConfig()
    if (success) {
      ElMessage.success(`已将 "${config.name}" 设为默认配置`)
    }
  } catch (error) {
    ElMessage.error(`设置默认配置失败: ${error.message}`)
    console.error('设置默认配置异常:', error)
  }
}

// 应用配置到Claude
const applyConfig = async (config) => {
  try {
    // 深度克隆以确保配置对象是可序列化的
    const configToApply = JSON.parse(JSON.stringify(config))
    const result = await window.api.applyDirectConfig(configToApply)

    if (result.success) {
      ElMessage.success(result.message)

      // 通知父组件重新检测网络模式
      window.dispatchEvent(new CustomEvent('claude-config-saved'))
    } else {
      ElMessage.error(`应用配置失败: ${result.error}`)
    }
  } catch (error) {
    ElMessage.error(`应用配置异常: ${error.message}`)
    console.error('应用配置异常:', error)
  }
}

// 删除配置
const deleteConfig = async (config) => {
  try {
    await ElMessageBox.confirm(`确定要删除配置 "${config.name}" 吗？此操作无法撤销。`, '删除确认', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
      confirmButtonClass: 'el-button--danger'
    })

    const index = directConfigs.value.findIndex((c) => c.id === config.id)
    if (index > -1) {
      directConfigs.value.splice(index, 1)

      const success = await saveDirectConfig()
      if (success) {
        ElMessage.success(`配置 "${config.name}" 已删除`)
      }
    }
  } catch {
    // 用户取消删除
  }
}

// 切换API Key显示状态
const toggleApiKeyVisibility = (configId) => {
  showApiKey[configId] = !showApiKey[configId]
}

// 掩码API Key
const maskApiKey = (apiKey) => {
  if (!apiKey) return ''
  if (apiKey.length <= 8) return '*'.repeat(apiKey.length)
  return apiKey.slice(0, 4) + '*'.repeat(apiKey.length - 8) + apiKey.slice(-4)
}

// 格式化日期
const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 拖拽功能
const handleDragStart = (event, config) => {
  dragItem.value = config
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', config.id)
}

const handleDragOver = (event) => {
  event.dataTransfer.dropEffect = 'move'
}

const handleDragEnter = (event, config) => {
  if (dragItem.value && dragItem.value.id !== config.id) {
    dragOverItem.value = config
  }
}

const handleDragLeave = () => {
  dragOverItem.value = null
}

const handleDrop = async (event, targetConfig) => {
  event.preventDefault()

  if (!dragItem.value || dragItem.value.id === targetConfig.id) {
    dragOverItem.value = null
    return
  }

  try {
    const draggedIndex = directConfigs.value.findIndex((c) => c.id === dragItem.value.id)
    const targetIndex = directConfigs.value.findIndex((c) => c.id === targetConfig.id)

    if (draggedIndex !== -1 && targetIndex !== -1) {
      // 移动配置
      const [draggedConfig] = directConfigs.value.splice(draggedIndex, 1)
      directConfigs.value.splice(targetIndex, 0, draggedConfig)

      // 更新排序权重
      directConfigs.value.forEach((config, index) => {
        config.order = index
      })

      // 保存排序结果
      await saveDirectConfig()
      ElMessage.success('配置顺序已更新')
    }
  } catch (error) {
    ElMessage.error('拖拽排序失败')
    console.error('拖拽排序异常:', error)
  } finally {
    dragItem.value = null
    dragOverItem.value = null
  }
}

const handleDragEnd = () => {
  dragItem.value = null
  dragOverItem.value = null
}

// 组件挂载时加载配置
onMounted(() => {
  loadDirectConfig()
})
</script>

<style scoped>
/* 拖拽样式优化 */
.draggable-card {
  transition: all 0.2s ease;
}

.draggable-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.dragging {
  opacity: 0.5;
  cursor: grabbing !important;
}

.drag-over {
  border-color: #3b82f6 !important;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

/* 拖拽手柄样式 */
.drag-handle {
  cursor: grab;
  transition: color 0.2s ease;
}

.drag-handle:hover {
  color: #6b7280;
}

.dragging .drag-handle {
  cursor: grabbing;
}

/* 搜索框样式 */
.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* 卡片内容偏移，为拖拽手柄留出空间 */
.card-content {
  margin-left: 1.5rem;
}
</style>
