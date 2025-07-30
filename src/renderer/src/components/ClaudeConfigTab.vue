<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-xl font-semibold text-gray-900">直连配置管理</h2>
      <el-button type="primary" @click="showAddConfigDialog" :loading="loading">
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
      <!-- 空状态 -->
      <div v-if="directConfigs.length === 0" class="text-center py-12">
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
        <h3 class="text-lg font-medium text-gray-900 mb-2">暂无直连配置</h3>
        <p class="text-gray-500 mb-4">创建第一个直连配置来开始使用</p>
        <el-button type="primary" @click="showAddConfigDialog">添加配置</el-button>
      </div>

      <!-- 配置卡片网格 -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="config in directConfigs"
          :key="config.id"
          class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <!-- 配置头部 -->
          <div class="flex items-start justify-between mb-3">
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
          <div class="mb-3">
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
          <div class="text-xs text-gray-400">创建于 {{ formatDate(config.createdAt) }}</div>
        </div>
      </div>
    </div>

    <!-- 添加/编辑配置弹窗 -->
    <el-dialog
      v-model="showConfigDialog"
      :title="editingConfig ? '编辑配置' : '添加配置'"
      width="500px"
      @closed="resetConfigForm"
    >
      <el-form :model="configForm" :rules="configRules" ref="configFormRef" label-width="80px">
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
          <el-button type="primary" @click="saveConfig" :loading="saving">
            {{ editingConfig ? '更新' : '添加' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
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

// 配置表单
const configForm = reactive({
  name: '',
  apiKey: '',
  baseUrl: 'https://api.anthropic.com',
  isDefault: false
})

// 表单验证规则
const configRules = {
  name: [{ required: true, message: '请输入配置名称', trigger: 'blur' }],
  apiKey: [{ required: true, message: '请输入API Key', trigger: 'blur' }],
  baseUrl: [
    { required: true, message: '请输入API基础地址', trigger: 'blur' },
    { type: 'url', message: '请输入正确的URL格式', trigger: 'blur' }
  ]
}

const configFormRef = ref()

// 加载直连配置
const loadDirectConfig = async () => {
  loading.value = true
  try {
    const result = await window.api.readDirectConfig()

    if (result.success) {
      directConfigs.value = result.data.directConfigs || []

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
  configForm.name = config.name
  configForm.apiKey = config.apiKey
  configForm.baseUrl = config.baseUrl
  configForm.isDefault = config.isDefault
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

// 组件挂载时加载配置
onMounted(() => {
  loadDirectConfig()
})
</script>

<style scoped>
/* 可以在这里添加特定的样式 */
</style>
