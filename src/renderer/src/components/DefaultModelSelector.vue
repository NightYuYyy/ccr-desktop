<template>
  <div class="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6 sm:mb-8">
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div class="flex items-center space-x-4">
        <div class="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500 rounded-lg flex justify-center items-center">
          <svg class="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <h3 class="text-lg font-semibold text-gray-900">默认模型选择</h3>
          <p class="text-sm text-gray-600">当前: {{ currentDefault || '未设置' }}</p>
        </div>
      </div>

      <div class="flex items-center space-x-3 w-full sm:w-auto">
        <div class="w-full sm:w-96">
          <el-select
            v-model="selectedModel"
            placeholder="选择默认模型"
            style="width: 100%"
            clearable
          >
            <el-option
              v-for="option in modelOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </div>
        <el-button
          type="primary"
          @click="handleSave"
          :disabled="!selectedModel || selectedModel === currentDefault"
          class="flex-shrink-0"
        >
          保存选择
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

// 组件属性
const props = defineProps({
  providers: {
    type: Array,
    default: () => []
  },
  currentDefault: {
    type: String,
    default: ''
  }
})

// 组件事件
const emit = defineEmits(['save'])

// 响应式数据
const selectedModel = ref('')

// 监听当前默认值变化，同步到选择框
watch(
  () => props.currentDefault,
  (newValue) => {
    selectedModel.value = newValue
  },
  { immediate: true }
)

// 计算所有可用的模型选项 (providerName,modelName)
const modelOptions = computed(() => {
  if (!props.providers) return []

  const options = []
  props.providers.forEach(provider => {
    if (provider.models && Array.isArray(provider.models)) {
      provider.models.forEach(model => {
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

// 处理保存
const handleSave = () => {
  emit('save', selectedModel.value)
}
</script>
