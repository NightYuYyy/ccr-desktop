<template>
  <div>
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
        <el-button type="primary" @click="$emit('refresh')">重新检查</el-button>
      </div>
    </div>

    <!-- 配置内容 -->
    <div v-else>
      <!-- 统计信息 -->
      <StatisticsCards :providers="configData.Providers" />

      <!-- 默认模型选择 -->
      <DefaultModelSelector
        :providers="configData.Providers"
        :current-default="configData.Router?.default || ''"
        @save="$emit('save-default-model', $event)"
      />

      <!-- Provider 卡片网格 -->
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        <ProviderCard
          v-for="provider in configData.Providers"
          :key="provider.name"
          :provider="provider"
          :default-route="configData.Router?.default || ''"
          @click="$emit('provider-click', $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import StatisticsCards from './StatisticsCards.vue'
import DefaultModelSelector from './DefaultModelSelector.vue'
import ProviderCard from './ProviderCard.vue'

// 组件属性
defineProps({
  configData: {
    type: Object,
    default: null
  },
  isLoading: {
    type: Boolean,
    default: false
  }
})

// 组件事件
defineEmits(['refresh', 'save-default-model', 'provider-click'])
</script>
