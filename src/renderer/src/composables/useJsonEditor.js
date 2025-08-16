import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'

// 统一消息管理函数
const showMessage = (message, type = 'info') => {
  ElMessage.closeAll() // 关闭所有现有消息
  return ElMessage[type](message)
}

/**
 * JSON编辑器相关的可复用逻辑
 * @param {string} initialContent - 初始内容
 */
export function useJsonEditor(initialContent = '') {
  // JSON编辑器相关状态
  const jsonContent = ref(initialContent)
  const jsonError = ref('')
  const jsonValid = ref(false)
  const jsonEditor = ref(null)

  // 撤销/重做历史
  const history = ref([])
  const historyIndex = ref(-1)
  const MAX_HISTORY = 100 // 最大历史记录数
  let lastInputTime = 0 // 记录最后一次输入时间
  let pendingChanges = '' // 待处理的连续输入
  const INPUT_GROUP_DELAY = 1000 // 1秒内的输入视为一组操作

  /**
   * 保存当前光标位置
   */
  const saveCursorPosition = () => {
    if (!jsonEditor.value) return { start: 0, end: 0 }

    return {
      start: jsonEditor.value.selectionStart,
      end: jsonEditor.value.selectionEnd
    }
  }

  /**
   * 恢复光标位置
   * @param {Object} position - 光标位置对象 {start, end}
   */
  const restoreCursorPosition = (position) => {
    if (!jsonEditor.value || !position) return

    jsonEditor.value.setSelectionRange(position.start, position.end)
    jsonEditor.value.focus()
  }

  /**
   * 添加历史记录
   * @param {string} content - 内容
   * @param {boolean} force - 是否强制添加（不合并）
   */
  const addHistory = (content, force = false) => {
    const now = Date.now()

    // 如果是强制添加或者距离上次输入超过1秒，或者内容变化很大，创建新的历史记录
    if (
      force ||
      now - lastInputTime > INPUT_GROUP_DELAY ||
      !pendingChanges ||
      Math.abs(content.length - pendingChanges.length) > 10
    ) {
      // 如果当前不在历史记录的末尾，删除后面的历史
      if (historyIndex.value < history.value.length - 1) {
        history.value = history.value.slice(0, historyIndex.value + 1)
      }

      // 保存当前光标位置
      const cursorPosition = saveCursorPosition()

      // 添加新历史记录（包含内容和光标位置）
      history.value.push({
        content: content,
        cursorPosition: cursorPosition
      })
      historyIndex.value = history.value.length - 1

      // 限制历史记录数量
      if (history.value.length > MAX_HISTORY) {
        history.value.shift()
        historyIndex.value = history.value.length - 1
      }

      pendingChanges = content
    } else {
      // 合并到当前历史记录
      if (historyIndex.value >= 0) {
        history.value[historyIndex.value].content = content
        history.value[historyIndex.value].cursorPosition = saveCursorPosition()
      }
    }

    lastInputTime = now
  }

  /**
   * 撤销操作
   */
  const undo = () => {
    if (historyIndex.value > 0) {
      historyIndex.value--
      const historyItem = history.value[historyIndex.value]
      jsonContent.value = historyItem.content
      // 更新编辑器内容，同时传入历史记录中的光标位置
      updateJsonEditorWithCustomCursor(historyItem.cursorPosition)
      validateJson()
      // 重置输入时间跟踪，避免撤销后的输入被合并
      lastInputTime = Date.now()
      pendingChanges = historyItem.content
      return true
    }
    return false
  }

  /**
   * 重做操作
   */
  const redo = () => {
    if (historyIndex.value < history.value.length - 1) {
      historyIndex.value++
      const historyItem = history.value[historyIndex.value]
      jsonContent.value = historyItem.content
      // 更新编辑器内容，同时传入历史记录中的光标位置
      updateJsonEditorWithCustomCursor(historyItem.cursorPosition)
      validateJson()
      // 重置输入时间跟踪，避免重做后的输入被合并
      lastInputTime = Date.now()
      pendingChanges = historyItem.content
      return true
    }
    return false
  }

  /**
   * 更新JSON编辑器内容
   * @param {boolean} preserveCursor - 是否保持光标位置
   */
  const updateJsonEditor = (preserveCursor = false) => {
    // 使用 v-model，不需要手动更新内容
    if (preserveCursor) {
      // 如果需要保持光标位置，稍后恢复
      setTimeout(() => {
        restoreCursorPosition(saveCursorPosition())
      }, 0)
    }
  }

  /**
   * 使用自定义光标位置更新JSON编辑器内容
   * @param {Object} cursorPosition - 自定义光标位置
   */
  const updateJsonEditorWithCustomCursor = (cursorPosition) => {
    // 使用 v-model，不需要手动更新内容
    if (cursorPosition) {
      setTimeout(() => {
        restoreCursorPosition(cursorPosition)
      }, 0)
    }
  }

  /**
   * 处理JSON输入
   * @param {Event} event - 输入事件
   */
  const handleJsonInput = () => {
    // 使用 v-model，内容已经自动更新
    // 只需要添加历史记录和验证
    addHistory(jsonContent.value)
    validateJson()
  }

  /**
   * 处理JSON粘贴
   * @param {Event} event - 粘贴事件
   */
  const handleJsonPaste = () => {
    // 让粘贴正常进行，然后在之后处理历史记录
    setTimeout(() => {
      // 粘贴操作强制创建新的历史记录
      addHistory(jsonContent.value, true)
      validateJson()
    }, 0)
  }

  /**
   * 处理键盘事件
   * @param {Event} event - 键盘事件
   */
  const handleJsonKeydown = (event) => {
    // 支持Tab键缩进
    if (event.key === 'Tab') {
      event.preventDefault()
      const textarea = jsonEditor.value
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const text = textarea.value
      const beforeText = text.substring(0, start)
      const afterText = text.substring(end)

      // 插入两个空格
      textarea.value = beforeText + '  ' + afterText
      jsonContent.value = textarea.value

      // 设置光标位置
      textarea.selectionStart = textarea.selectionEnd = start + 2

      // Tab键操作强制创建新的历史记录
      addHistory(jsonContent.value, true)
      validateJson()
      return
    }

    // 支持Ctrl+Z/Cmd+Z撤销和Ctrl+Y/Cmd+Y重做
    if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
      event.preventDefault()
      if (event.shiftKey) {
        // Ctrl+Shift+Z 或 Cmd+Shift+Z 为重做
        redo()
      } else {
        // Ctrl+Z 或 Cmd+Z 为撤销
        undo()
      }
      return
    }

    if ((event.ctrlKey || event.metaKey) && event.key === 'y') {
      event.preventDefault()
      redo()
      return
    }

    // 支持Ctrl+A/Cmd+A全选
    if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
      event.preventDefault()
      jsonEditor.value.select()
      return
    }
  }

  /**
   * 验证JSON格式
   */
  const validateJson = () => {
    if (!jsonContent.value.trim()) {
      jsonError.value = ''
      jsonValid.value = false
      return
    }

    try {
      JSON.parse(jsonContent.value)
      jsonError.value = ''
      jsonValid.value = true
    } catch (error) {
      jsonError.value = `JSON 格式错误: ${error.message}`
      jsonValid.value = false
    }
  }

  /**
   * 格式化JSON
   */
  const formatJson = () => {
    if (!jsonContent.value.trim()) return

    try {
      const parsed = JSON.parse(jsonContent.value)
      const formatted = JSON.stringify(parsed, null, 2)
      // 格式化操作强制创建新的历史记录
      addHistory(jsonContent.value, true)
      jsonContent.value = formatted
      updateJsonEditorWithCustomCursor({ start: 0, end: 0 })
      validateJson()
      showMessage('JSON 已格式化', 'success')
    } catch {
      showMessage('JSON 格式错误，无法格式化', 'error')
    }
  }

  /**
   * 设置JSON内容
   * @param {string|Object} content - 内容（字符串或对象）
   */
  const setJsonContent = (content) => {
    if (typeof content === 'string') {
      jsonContent.value = content
    } else {
      jsonContent.value = JSON.stringify(content, null, 2)
    }

    // 初始化历史记录
    history.value = [
      {
        content: jsonContent.value,
        cursorPosition: { start: 0, end: 0 }
      }
    ]
    historyIndex.value = 0
    lastInputTime = Date.now()
    pendingChanges = jsonContent.value

    validateJson()
  }

  /**
   * 获取解析后的JSON对象
   * @returns {Object|null} 解析后的JSON对象，如果解析失败则返回null
   */
  const getParsedJson = () => {
    if (!jsonValid.value || !jsonContent.value.trim()) {
      return null
    }

    try {
      return JSON.parse(jsonContent.value)
    } catch {
      return null
    }
  }

  /**
   * 重置编辑器
   */
  const resetEditor = () => {
    jsonContent.value = ''
    jsonError.value = ''
    jsonValid.value = false
    history.value = []
    historyIndex.value = -1
    lastInputTime = 0
    pendingChanges = ''
  }

  // 监听内容变化时更新编辑器（仅在需要时更新，比如撤销/重做操作）
  watch(jsonContent, (newContent, oldContent) => {
    if (newContent !== oldContent) {
      // 只在撤销/重做等操作时更新编辑器显示
      // 正常输入时不需要更新，因为innerHTML已经被用户输入改变
      const isUndoRedoOperation =
        historyIndex.value >= 0 &&
        history.value[historyIndex.value] &&
        history.value[historyIndex.value].content === newContent

      if (isUndoRedoOperation) {
        setTimeout(() => {
          updateJsonEditorWithCustomCursor(history.value[historyIndex.value].cursorPosition)
        }, 0)
      }
    }
  })

  return {
    // 状态
    jsonContent,
    jsonError,
    jsonValid,
    jsonEditor,

    // 方法
    updateJsonEditor,
    updateJsonEditorWithCustomCursor,
    handleJsonInput,
    handleJsonPaste,
    handleJsonKeydown,
    validateJson,
    formatJson,
    setJsonContent,
    getParsedJson,
    resetEditor,
    saveCursorPosition,
    restoreCursorPosition
  }
}
