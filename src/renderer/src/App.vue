<script setup>
import { ref } from 'vue'
import Versions from './components/Versions.vue'

const configResult = ref(null)
const isLoading = ref(false)

// 测试配置读取功能
const testReadConfig = async () => {
  isLoading.value = true
  configResult.value = null

  try {
    const result = await window.api.readSettings()
    configResult.value = result
    console.log('配置读取结果:', result)
  } catch (error) {
    configResult.value = {
      success: false,
      error: `API调用失败: ${error.message}`
    }
    console.error('调用API失败:', error)
  } finally {
    isLoading.value = false
  }
}

// 清空结果
const clearResult = () => {
  configResult.value = null
}
</script>

<template>
  <img alt="logo" class="logo" src="./assets/electron.svg" />
  <div class="creator">Powered by electron-vite</div>
  <div class="text">
    Build an Electron app with
    <span class="vue">Vue</span>
  </div>
  <p class="tip">Please try pressing <code>F12</code> to open the devTool</p>
  <div class="actions">
    <div class="action">
      <a href="https://electron-vite.org/" target="_blank" rel="noreferrer">Documentation</a>
    </div>
    <div class="action">
      <a target="_blank" rel="noreferrer" @click="testReadConfig" :class="{ disabled: isLoading }">
        {{ isLoading ? '读取中...' : '读取配置文件' }}
      </a>
    </div>
    <div class="action" v-if="configResult">
      <a target="_blank" rel="noreferrer" @click="clearResult">清空结果</a>
    </div>
  </div>

  <!-- 配置结果显示区域 -->
  <div v-if="configResult" class="config-result">
    <h3>配置读取结果</h3>
    <div v-if="configResult.success" class="success">
      <p><strong>✅ 读取成功!</strong></p>
      <p><strong>配置文件路径:</strong> <code>{{ configResult.configPath }}</code></p>
      <div class="config-data">
        <strong>配置内容:</strong>
        <pre>{{ JSON.stringify(configResult.data, null, 2) }}</pre>
      </div>
    </div>
    <div v-else class="error">
      <p><strong>❌ 读取失败</strong></p>
      <p><strong>错误信息:</strong> {{ configResult.error }}</p>
      <p v-if="configResult.configPath"><strong>尝试访问的路径:</strong> <code>{{ configResult.configPath }}</code></p>
      <div v-if="configResult.suggestion" class="suggestion">
        <p><strong>建议:</strong></p>
        <p>{{ configResult.suggestion.message }}</p>
        <div class="template">
          <strong>可以使用以下默认配置模板:</strong>
          <pre>{{ JSON.stringify(configResult.suggestion.template, null, 2) }}</pre>
        </div>
      </div>
    </div>
  </div>
  <Versions />
</template>

<style scoped>
.disabled {
  opacity: 0.6;
  cursor: not-allowed !important;
  pointer-events: none;
}

.config-result {
  margin: 20px auto;
  max-width: 800px;
  text-align: left;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.config-result h3 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 1.2em;
  text-align: center;
}

.success {
  background: #d4edda;
  border: 1px solid #c3e6cb;
  border-radius: 6px;
  padding: 15px;
  color: #155724;
}

.error {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 6px;
  padding: 15px;
  color: #721c24;
}

.suggestion {
  margin-top: 15px;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 4px;
  padding: 12px;
  color: #856404;
}

.config-data, .template {
  margin-top: 10px;
}

.config-result pre {
  background: #2d3748;
  color: #e2e8f0;
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
  line-height: 1.4;
  max-height: 300px;
  overflow-y: auto;
}

.config-result code {
  background: #e9ecef;
  color: #495057;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.9em;
  font-family: 'Monaco', 'Menlo', monospace;
}

.config-result p {
  margin: 8px 0;
  line-height: 1.5;
}

.config-result strong {
  font-weight: 600;
}
</style>
