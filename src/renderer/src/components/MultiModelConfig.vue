<template>
  <div class="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
    <div class="flex items-center space-x-4 mb-6">
      <div
        class="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500 rounded-lg flex justify-center items-center"
      >
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
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      </div>
      <div>
        <h3 class="text-lg font-semibold text-gray-900">多模型配置</h3>
        <p class="text-sm text-gray-600">为不同场景配置专用模型</p>
      </div>
    </div>

    <!-- 全局保存按钮 -->
    <div class="flex justify-end mb-4">
      <el-button
        type="success"
        :disabled="!isAnyModelChanged && !isThresholdChanged"
        size="default"
        @click="saveAllConfig"
      >
        保存所有配置
      </el-button>
    </div>

    <!-- 模型配置卡片网格 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <!-- 默认模型配置卡片 -->
      <div class="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center">
            <span class="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
            <h4 class="font-medium text-gray-900">默认模型</h4>
          </div>
          <el-tag size="small" type="info">default</el-tag>
        </div>
        <p class="text-xs text-gray-500 mb-3">通用场景下的默认模型选择</p>
        <div class="space-y-3">
          <el-select
            v-model="localRouter.default"
            placeholder="选择默认模型"
            style="width: 100%"
            clearable
            size="small"
          >
            <el-option
              v-for="option in modelOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </div>
      </div>

      <!-- Background模型配置卡片 -->
      <div class="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center">
            <span class="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
            <h4 class="font-medium text-gray-900">后台任务模型</h4>
          </div>
          <el-tag size="small" type="info">background</el-tag>
        </div>
        <p class="text-xs text-gray-500 mb-3">长时间运行的后台任务专用模型</p>
        <div class="space-y-3">
          <el-select
            v-model="localRouter.background"
            placeholder="选择后台任务模型"
            style="width: 100%"
            clearable
            size="small"
          >
            <el-option
              v-for="option in modelOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </div>
      </div>

      <!-- Think模型配置卡片 -->
      <div class="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center">
            <span class="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
            <h4 class="font-medium text-gray-900">思考模型</h4>
          </div>
          <el-tag size="small" type="info">think</el-tag>
        </div>
        <p class="text-xs text-gray-500 mb-3">复杂推理和深度思考任务专用模型</p>
        <div class="space-y-3">
          <el-select
            v-model="localRouter.think"
            placeholder="选择思考模型"
            style="width: 100%"
            clearable
            size="small"
          >
            <el-option
              v-for="option in modelOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </div>
      </div>

      <!-- LongContext模型配置卡片 -->
      <div class="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center">
            <span class="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
            <h4 class="font-medium text-gray-900">长文本模型</h4>
          </div>
          <el-tag size="small" type="info">longContext</el-tag>
        </div>
        <p class="text-xs text-gray-500 mb-3">处理超长文本内容的专用模型</p>
        <div class="space-y-3">
          <el-select
            v-model="localRouter.longContext"
            placeholder="选择长文本模型"
            style="width: 100%"
            clearable
            size="small"
          >
            <el-option
              v-for="option in modelOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </div>
      </div>
    </div>

    <!-- 长文本阈值配置 -->
    <div class="mt-6 pt-5 border-t border-gray-100">
      <div class="flex items-start justify-between mb-3">
        <div class="flex items-center">
          <span class="w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
          <h4 class="font-medium text-gray-900">长文本阈值设置</h4>
        </div>
        <el-tag size="small" type="info">longContextThreshold</el-tag>
      </div>
      <p class="text-xs text-gray-500 mb-4">当输入文本长度超过此阈值时，将自动使用长文本模型</p>
      <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div class="w-full sm:w-64">
          <el-input-number
            v-model="localRouter.longContextThreshold"
            placeholder="输入阈值"
            style="width: 100%"
            :min="0"
            :step="1000"
            size="small"
          />
        </div>
        <div class="text-sm text-gray-600 whitespace-nowrap">
          当前值: {{ localRouter.longContextThreshold?.toLocaleString() }} 字符
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'

// 组件属性
const props = defineProps({
  providers: {
    type: Array,
    default: () => []
  },
  router: {
    type: Object,
    default: () => ({})
  }
})

// 组件事件
const emit = defineEmits(['save-model', 'save-threshold', 'save-all'])

// 本地路由配置
const localRouter = ref({
  default: '',
  background: '',
  think: '',
  longContext: '',
  longContextThreshold: 60000
})

// 原始路由配置（用于比较变化）
const originalRouter = ref({})

// 监听router变化，同步到本地
watch(
  () => props.router,
  (newRouter) => {
    if (newRouter) {
      localRouter.value = {
        default: newRouter.default || '',
        background: newRouter.background || '',
        think: newRouter.think || '',
        longContext: newRouter.longContext || '',
        longContextThreshold: newRouter.longContextThreshold || 60000
      }
      originalRouter.value = { ...localRouter.value }
    }
  },
  { immediate: true, deep: true }
)

// 计算所有可用的模型选项 (providerName,modelName)
const modelOptions = computed(() => {
  if (!props.providers) return []

  const options = []
  props.providers.forEach((provider) => {
    if (provider.models && Array.isArray(provider.models)) {
      provider.models.forEach((model) => {
        options.push({
          label: `${provider.name} → ${model}`,
          value: `${provider.name},${model}`,
          provider: provider.name,
          model: model
        })
      })
    }
  })
  return options
})

// 检查模型是否发生变化
const isModelChanged = (modelType) => {
  return localRouter.value[modelType] !== originalRouter.value[modelType]
}

// 检查阈值是否发生变化
const isThresholdChanged = computed(() => {
  return localRouter.value.longContextThreshold !== originalRouter.value.longContextThreshold
})

// 检查是否有任何模型配置发生变化
const isAnyModelChanged = computed(() => {
  return (
    isModelChanged('default') ||
    isModelChanged('background') ||
    isModelChanged('think') ||
    isModelChanged('longContext')
  )
})

// 一键保存所有配置
const saveAllConfig = async () => {
  try {
    // 检查是否有任何配置发生变化
    if (!isAnyModelChanged.value && !isThresholdChanged.value) {
      ElMessage.info('没有需要保存的配置')
      return
    }

    // 验证所有发生变化的模型配置
    const modelTypes = ['default', 'background', 'think', 'longContext']
    const errorMessages = []

    for (const modelType of modelTypes) {
      if (isModelChanged(modelType)) {
        const modelValue = localRouter.value[modelType]

        // 验证模型格式
        if (modelValue && !modelValue.includes(',')) {
          errorMessages.push(`${modelType} 模型格式错误`)
          continue
        }

        // 如果提供了模型，验证其存在性
        if (modelValue) {
          const [providerName, modelName] = modelValue.split(',')
          const provider = props.providers?.find((p) => p.name === providerName)

          if (!provider) {
            errorMessages.push(`找不到Provider: ${providerName}`)
            continue
          }

          if (!provider.models || !provider.models.includes(modelName)) {
            errorMessages.push(`Provider "${providerName}" 中找不到模型: ${modelName}`)
            continue
          }
        }
      }
    }

    // 验证阈值配置
    if (isThresholdChanged.value && localRouter.value.longContextThreshold < 0) {
      errorMessages.push('阈值不能为负数')
    }

    // 如果有错误，显示错误信息并中止保存
    if (errorMessages.length > 0) {
      ElMessage.error(`配置验证失败: ${errorMessages.join('；')}`)
      return
    }

    // 构建完整的Router配置对象，确保只包含可序列化的原始数据
    const routerConfig = {
      default: localRouter.value.default,
      background: localRouter.value.background,
      think: localRouter.value.think,
      longContext: localRouter.value.longContext,
      longContextThreshold: localRouter.value.longContextThreshold
    }

    // 发送整体保存事件
    emit('save-all', routerConfig)

    // 更新原始值为当前值（标记为已保存）
    originalRouter.value = { ...localRouter.value }

    ElMessage.success('所有配置已保存')
  } catch (error) {
    ElMessage.error(`保存配置失败: ${error.message}`)
    console.error('保存配置失败:', error)
  }
}
</script>

<style scoped>
/* 卡片悬停效果 */
.border:hover {
  border-color: #3b82f6;
}
</style>
