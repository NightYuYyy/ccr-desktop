<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <h2 class="text-xl font-semibold text-gray-900 mb-6">Claude 配置</h2>
    
    <!-- 代理切换按钮 -->
    <div class="mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-medium text-gray-900">代理设置</h3>
          <p class="text-sm text-gray-500 mt-1">
            选择是否通过代理访问 Claude API
          </p>
        </div>
        <el-switch
          v-model="useProxy"
          active-text="使用代理"
          inactive-text="直连"
          @change="handleProxyChange"
        />
      </div>
    </div>
    
    <!-- 加载状态 -->
    <div v-if="loading" class="flex justify-center items-center py-10">
      <div class="text-center">
        <div class="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p class="text-gray-600">正在加载配置...</p>
      </div>
    </div>
    
    <!-- 配置内容 -->
    <div v-else class="space-y-6">
      <!-- API Key 配置 -->
      <div class="border-b border-gray-200 pb-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">API 密钥</h3>
        <div class="max-w-2xl">
          <el-input
            v-model="claudeConfig.env.ANTHROPIC_API_KEY"
            type="password"
            placeholder="请输入 Claude API Key"
            show-password
            class="mb-2"
          />
          <p class="text-sm text-gray-500 mt-1">
            输入您的 Claude API Key 以启用 Claude 服务
          </p>
        </div>
      </div>
      
      <!-- API Base URL 配置 -->
      <div class="border-b border-gray-200 pb-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">API 基础地址</h3>
        <div class="max-w-2xl">
          <el-input
            v-model="claudeConfig.env.ANTHROPIC_BASE_URL"
            placeholder="请输入 Claude API 基础地址"
            class="mb-2"
          />
          <p class="text-sm text-gray-500 mt-1">
            输入 Claude API 的基础地址
          </p>
        </div>
      </div>
      
      <!-- 模型配置 -->
      <div class="border-b border-gray-200 pb-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">模型设置</h3>
        <div class="max-w-2xl space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">最大输出 Token 数</label>
            <el-input
              v-model="claudeConfig.env.CLAUDE_CODE_MAX_OUTPUT_TOKENS"
              placeholder="请输入最大输出 Token 数"
              class="mb-2"
            />
            <p class="text-sm text-gray-500 mt-1">
              设置 Claude 响应的最大 Token 数量
            </p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">禁用非必要流量</label>
            <el-switch
              v-model="disableNonEssentialTraffic"
              active-text="启用"
              inactive-text="禁用"
            />
            <p class="text-sm text-gray-500 mt-1">
              禁用非必要的网络流量以提高性能
            </p>
          </div>
        </div>
      </div>
      
      <!-- 权限配置 -->
      <div class="border-b border-gray-200 pb-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">权限设置</h3>
        <div class="max-w-2xl space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">允许的权限</label>
            <el-input
              v-model="allowPermissions"
              placeholder="请输入允许的权限，多个权限用逗号分隔"
              class="mb-2"
            />
            <p class="text-sm text-gray-500 mt-1">
              设置允许的权限列表
            </p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">拒绝的权限</label>
            <el-input
              v-model="denyPermissions"
              placeholder="请输入拒绝的权限，多个权限用逗号分隔"
              class="mb-2"
            />
            <p class="text-sm text-gray-500 mt-1">
              设置拒绝的权限列表
            </p>
          </div>
        </div>
      </div>
      
      <!-- API Key Helper -->
      <div class="border-b border-gray-200 pb-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">API Key Helper</h3>
        <div class="max-w-2xl">
          <el-input
            v-model="claudeConfig.apiKeyHelper"
            placeholder="请输入 API Key Helper 命令"
            class="mb-2"
          />
          <p class="text-sm text-gray-500 mt-1">
            设置 API Key Helper 命令
          </p>
        </div>
      </div>
      
      <!-- 操作按钮 -->
      <div class="flex justify-between items-center">
        <el-button type="info" @click="openConfigFolder">
          打开配置文件夹
        </el-button>
        <div class="flex space-x-3">
          <el-button @click="resetConfig">重置</el-button>
          <el-button type="primary" @click="saveConfig">保存配置</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElSwitch } from 'element-plus'

// 响应式数据
const loading = ref(false)
const useProxy = ref(false)
const disableNonEssentialTraffic = ref(false)

const claudeConfig = reactive({
  env: {
    ANTHROPIC_API_KEY: '',
    ANTHROPIC_BASE_URL: '',
    CLAUDE_CODE_MAX_OUTPUT_TOKENS: '',
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: ''
  },
  permissions: {
    allow: [],
    deny: []
  },
  apiKeyHelper: ''
})

// 计算属性：允许的权限字符串
const allowPermissions = ref('')
// 计算属性：拒绝的权限字符串
const denyPermissions = ref('')

// 处理代理切换
const handleProxyChange = (value) => {
  ElMessage.info(`已切换到${value ? '代理模式' : '直连模式'}`)
  // 这里可以根据需要更新API基础地址
  if (value) {
    // 使用代理地址
    claudeConfig.env.ANTHROPIC_BASE_URL = 'https://sg.instcopilot-api.com'
  } else {
    // 使用直连地址
    claudeConfig.env.ANTHROPIC_BASE_URL = 'https://api.anthropic.com'
  }
}

// 加载配置
const loadConfig = async () => {
  loading.value = true
  try {
    // 获取Claude配置文件路径
    const configPath = await window.api.getClaudeSettingsPath()
    
    // 读取配置文件
    const result = await window.api.readFile(configPath)
    
    if (result.success) {
      const config = JSON.parse(result.data)
      
      // 更新配置数据
      if (config.env) {
        claudeConfig.env = { ...claudeConfig.env, ...config.env }
      }
      
      if (config.permissions) {
        claudeConfig.permissions = { ...claudeConfig.permissions, ...config.permissions }
      }
      
      if (config.apiKeyHelper) {
        claudeConfig.apiKeyHelper = config.apiKeyHelper
      }
      
      // 设置代理开关状态
      useProxy.value = config.env?.ANTHROPIC_BASE_URL?.includes('instcopilot-api.com') || false
      
      // 设置禁用非必要流量开关状态
      disableNonEssentialTraffic.value = config.env?.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC === '1'
      
      // 设置权限字符串
      allowPermissions.value = config.permissions?.allow?.join(', ') || ''
      denyPermissions.value = config.permissions?.deny?.join(', ') || ''
      
      ElMessage.success('配置加载成功')
    } else {
      // 配置文件不存在或读取失败，使用默认配置
      ElMessage.info('使用默认配置')
    }
  } catch (error) {
    ElMessage.error(`加载配置失败: ${error.message}`)
    console.error('加载配置失败:', error)
  } finally {
    loading.value = false
  }
}

// 保存配置
const saveConfig = async () => {
  try {
    // 获取Claude配置文件路径
    const configPath = await window.api.getClaudeSettingsPath()
    
    // 准备要保存的配置数据
    const configToSave = {
      env: {
        ...claudeConfig.env,
        CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: disableNonEssentialTraffic.value ? '1' : '0'
      },
      permissions: {
        allow: allowPermissions.value.split(',').map(item => item.trim()).filter(item => item),
        deny: denyPermissions.value.split(',').map(item => item.trim()).filter(item => item)
      },
      apiKeyHelper: claudeConfig.apiKeyHelper
    }
    
    // 写入配置文件
    const result = await window.api.writeFile(configPath, JSON.stringify(configToSave, null, 2))
    
    if (result.success) {
      ElMessage.success('配置已保存')
    } else {
      ElMessage.error(`保存失败: ${result.error}`)
    }
  } catch (error) {
    ElMessage.error(`保存配置异常: ${error.message}`)
    console.error('保存配置异常:', error)
  }
}

// 重置配置
const resetConfig = () => {
  claudeConfig.env.ANTHROPIC_API_KEY = ''
  claudeConfig.env.ANTHROPIC_BASE_URL = ''
  claudeConfig.env.CLAUDE_CODE_MAX_OUTPUT_TOKENS = ''
  claudeConfig.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = ''
  disableNonEssentialTraffic.value = false
  claudeConfig.apiKeyHelper = ''
  allowPermissions.value = ''
  denyPermissions.value = ''
  useProxy.value = false
  ElMessage.info('配置已重置')
}

// 打开配置文件夹
const openConfigFolder = async () => {
  try {
    const result = await window.api.openClaudeConfigFolder()
    if (result.success) {
      ElMessage.success('Claude配置文件夹已打开')
    } else {
      ElMessage.error(`打开Claude配置文件夹失败: ${result.error}`)
    }
  } catch (error) {
    ElMessage.error(`打开Claude配置文件夹异常: ${error.message}`)
    console.error('打开Claude配置文件夹异常:', error)
  }
}

// 组件挂载时加载配置
onMounted(() => {
  loadConfig()
})
</script>

<style scoped>
/* 可以在这里添加特定的样式 */
</style>