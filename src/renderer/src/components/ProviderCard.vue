<template>
  <div
    class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer"
    @click="$emit('click', provider)"
  >
    <div class="p-4 sm:p-6">
      <!-- 头部：名称和状态 -->
      <div class="flex items-start justify-between mb-4">
        <div class="min-w-0 flex-1 mr-3">
          <h3 class="text-base sm:text-lg font-semibold text-gray-900 mb-1 truncate">
            {{ provider.name }}
          </h3>
          <p class="text-sm text-gray-500 truncate">{{ formatUrl(provider.api_base_url) }}</p>
        </div>
        <el-tag :type="providerStatus.status" size="small" class="flex-shrink-0">
          {{ providerStatus.text }}
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
            v-if="isDefaultProvider"
            class="w-2 h-2 bg-green-500 rounded-full"
            title="默认路由"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

// 组件属性
const props = defineProps({
  provider: {
    type: Object,
    required: true
  },
  defaultRoute: {
    type: String,
    default: ''
  }
})

// 组件事件
defineEmits(['click'])

// 获取Provider状态
const providerStatus = computed(() => {
  if (!props.provider.api_key || props.provider.api_key.trim() === '') {
    return { status: 'warning', text: '未配置Key' }
  }
  return { status: 'success', text: '已配置' }
})

// 格式化URL显示
const formatUrl = (url) => {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

// 是否是默认Provider
const isDefaultProvider = computed(() => {
  return props.defaultRoute?.includes(props.provider.name)
})
</script>
