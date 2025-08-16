<template>
  <div class="json-editor-container">
    <textarea
      ref="jsonEditor"
      v-model="jsonContent"
      class="json-editor"
      :class="{ 'json-error': jsonError, 'json-success': jsonValid }"
      :placeholder="placeholder"
      spellcheck="false"
      @input="handleJsonInput"
      @paste="handleJsonPaste"
      @keydown="handleJsonKeydown"
      @mouseup="saveCursorPosition"
      @keyup="saveCursorPosition"
      @focus="saveCursorPosition"
    ></textarea>

    <!-- 错误提示 -->
    <div v-if="jsonError" class="json-error-message">
      <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
        <path
          fill-rule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
          clip-rule="evenodd"
        />
      </svg>
      {{ jsonError }}
    </div>

    <!-- 成功提示 -->
    <div v-if="jsonValid && !jsonError" class="json-success-message">
      <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clip-rule="evenodd"
        />
      </svg>
      JSON 格式正确
    </div>

    <!-- 工具栏 -->
    <div class="json-toolbar">
      <div class="flex items-center space-x-2">
        <button class="toolbar-btn" title="格式化 JSON (Ctrl+Shift+F)" @click="formatJson">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
          格式化
        </button>
        <button class="toolbar-btn" title="撤销 (Ctrl+Z)" :disabled="!canUndo" @click="undo">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
            />
          </svg>
          撤销
        </button>
        <button class="toolbar-btn" title="重做 (Ctrl+Y)" :disabled="!canRedo" @click="redo">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6"
            />
          </svg>
          重做
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue'
import { useJsonEditor } from '../composables/useJsonEditor'

// 组件属性
const props = defineProps({
  modelValue: {
    type: [String, Object],
    default: ''
  },
  placeholder: {
    type: String,
    default: '请输入 JSON 配置'
  },
  height: {
    type: String,
    default: '200px'
  }
})

// 组件事件
const emit = defineEmits(['update:modelValue', 'valid-change', 'error-change'])

// 使用 JSON 编辑器逻辑
const {
  jsonContent,
  jsonError,
  jsonValid,
  jsonEditor,
  handleJsonInput,
  handleJsonPaste,
  handleJsonKeydown,
  validateJson,
  formatJson,
  setJsonContent,
  getParsedJson,
  resetEditor,
  saveCursorPosition,
  undo,
  redo
} = useJsonEditor()

// 计算属性
const canUndo = computed(() => {
  return jsonEditor.value?.historyIndex > 0
})

const canRedo = computed(() => {
  return jsonEditor.value?.historyIndex < jsonEditor.value?.history?.length - 1
})

// 监听外部 modelValue 变化
watch(
  () => props.modelValue,
  (newValue) => {
    if (typeof newValue === 'string') {
      if (newValue !== jsonContent.value) {
        setJsonContent(newValue)
      }
    } else if (typeof newValue === 'object') {
      const newJsonString = JSON.stringify(newValue, null, 2)
      if (newJsonString !== jsonContent.value) {
        setJsonContent(newValue)
      }
    }
  },
  { immediate: true }
)

// 监听内部内容变化
watch(jsonContent, (newValue) => {
  emit('update:modelValue', newValue)
})

// 监听验证状态变化
watch([jsonValid, jsonError], ([newValid, newError]) => {
  emit('valid-change', newValid)
  emit('error-change', newError)
})

// 监听键盘快捷键
onMounted(() => {
  const handleKeyDown = (event) => {
    // Ctrl+Shift+F 格式化
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'F') {
      event.preventDefault()
      formatJson()
    }
  }

  document.addEventListener('keydown', handleKeyDown)

  return () => {
    document.removeEventListener('keydown', handleKeyDown)
  }
})

// 暴露方法给父组件
defineExpose({
  validateJson,
  formatJson,
  getParsedJson,
  resetEditor,
  setJsonContent
})
</script>

<style scoped>
.json-editor-container {
  position: relative;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  overflow: hidden;
  transition: border-color 0.2s ease;
}

.json-editor-container:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.json-editor {
  width: 100%;
  min-height: v-bind(height);
  max-height: 400px;
  overflow-y: auto;
  padding: 20px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
  background: #f8fafc;
  color: #374151;
  white-space: pre;
  resize: vertical;
  border: none;
  outline: none;
  border-radius: 6px;
  box-sizing: border-box;
}

.json-editor.json-error {
  border-color: #ef4444;
  background: #fef2f2;
}

.json-editor.json-success {
  border-color: #10b981;
  background: #f0fdf4;
}

.json-error-message {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fee2e2;
  color: #dc2626;
  padding: 8px 12px;
  font-size: 12px;
  display: flex;
  align-items: center;
  border-top: 1px solid #fca5a5;
}

.json-success-message {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #dcfce7;
  color: #16a34a;
  padding: 8px 12px;
  font-size: 12px;
  display: flex;
  align-items: center;
  border-top: 1px solid #bbf7d0;
}

.json-toolbar {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
  z-index: 10;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 12px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(4px);
}

.toolbar-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 1);
  border-color: #3b82f6;
  color: #3b82f6;
}

.toolbar-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 滚动条样式 */
.json-editor::-webkit-scrollbar {
  width: 8px;
}

.json-editor::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.json-editor::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.json-editor::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
