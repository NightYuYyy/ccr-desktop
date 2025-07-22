<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
    <!-- 服务提供商数量 -->
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
            {{ providers?.length || 0 }}
          </p>
          <p class="text-sm text-gray-600">服务提供商</p>
        </div>
      </div>
    </div>

    <!-- 已配置Key数量 -->
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
            {{ configuredCount }}
          </p>
          <p class="text-sm text-gray-600">已配置Key</p>
        </div>
      </div>
    </div>

    <!-- 可用模型数量 -->
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
            {{ totalModels }}
          </p>
          <p class="text-sm text-gray-600">可用模型</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

// 组件属性
const props = defineProps({
  providers: {
    type: Array,
    default: () => []
  }
})

// 已配置Key的Provider数量
const configuredCount = computed(() => {
  return props.providers?.filter((p) => p.api_key && p.api_key.trim() !== '').length || 0
})

// 可用模型总数
const totalModels = computed(() => {
  return props.providers?.reduce((sum, p) => sum + (p.models?.length || 0), 0) || 0
})
</script>
