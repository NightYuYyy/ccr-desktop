import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'

// 统一消息管理函数
const showMessage = (message, type = 'info') => {
  ElMessage.closeAll() // 关闭所有现有消息
  return ElMessage[type](message)
}

/**
 * Claude配置编辑相关的可复用逻辑
 */
export function useClaudeSettings() {
  // Claude配置编辑相关状态
  const showClaudeSettingsDialog = ref(false)
  const claudeSettingsContent = ref('')
  const savingClaudeSettings = ref(false)
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
      claudeSettingsContent.value = historyItem.content
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
      claudeSettingsContent.value = historyItem.content
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
    addHistory(claudeSettingsContent.value)
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
      addHistory(claudeSettingsContent.value, true)
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
      claudeSettingsContent.value = textarea.value

      // 设置光标位置
      textarea.selectionStart = textarea.selectionEnd = start + 2

      // Tab键操作强制创建新的历史记录
      addHistory(claudeSettingsContent.value, true)
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

    // 支持Ctrl+S/Cmd+S保存
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault()
      // 这里不直接调用保存函数，因为需要访问父组件的函数
      // 可以通过自定义事件通知父组件保存
      window.dispatchEvent(new CustomEvent('claude-settings-save-shortcut'))
      return
    }
  }

  /**
   * 验证JSON格式
   */
  const validateJson = () => {
    if (!claudeSettingsContent.value.trim()) {
      jsonError.value = ''
      jsonValid.value = false
      return
    }

    try {
      JSON.parse(claudeSettingsContent.value)
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
    if (!claudeSettingsContent.value.trim()) return

    try {
      const parsed = JSON.parse(claudeSettingsContent.value)
      const formatted = JSON.stringify(parsed, null, 2)
      // 格式化操作强制创建新的历史记录
      addHistory(claudeSettingsContent.value, true)
      claudeSettingsContent.value = formatted
      updateJsonEditorWithCustomCursor({ start: 0, end: 0 })
      validateJson()
      showMessage('JSON 已格式化', 'success')
    } catch {
      showMessage('JSON 格式错误，无法格式化', 'error')
    }
  }

  /**
   * 编辑Claude settings.json
   * @param {Function} getClaudeSettingsPath - 获取Claude配置文件路径的函数
   * @param {Function} readFile - 读取文件的函数
   */
  const editClaudeSettings = async (getSettingsPath, readFile) => {
    try {
      // 获取Claude settings.json文件路径
      const pathResult = await getSettingsPath()
      if (!pathResult.success) {
        showMessage(`获取配置文件路径失败: ${pathResult.error}`, 'error')
        return
      }

      // 读取settings.json文件
      const readResult = await readFile(pathResult.data)
      if (readResult.success) {
        // 格式化JSON并显示
        const formattedContent = JSON.stringify(readResult.data, null, 2)
        claudeSettingsContent.value = formattedContent
        // 初始化历史记录
        history.value = [
          {
            content: formattedContent,
            cursorPosition: { start: 0, end: 0 }
          }
        ]
        historyIndex.value = 0
        // 重置输入时间跟踪
        lastInputTime = Date.now()
        pendingChanges = formattedContent

        jsonError.value = ''
        jsonValid.value = true
        showClaudeSettingsDialog.value = true

        // 等待DOM更新后设置编辑器内容
        setTimeout(() => {
          updateJsonEditor()
        }, 100)
      } else {
        showMessage(`读取配置文件失败: ${readResult.error}`, 'error')
      }
    } catch (error) {
      showMessage(`编辑配置文件异常: ${error.message}`, 'error')
      console.error('编辑Claude settings异常:', error)
    }
  }

  /**
   * 保存Claude settings.json
   * @param {Function} getClaudeSettingsPath - 获取Claude配置文件路径的函数
   * @param {Function} writeFile - 写入文件的函数
   * @param {Function} detectNetworkMode - 检测网络模式的函数
   * @param {Function} updateFloatingWindowWithCurrentInfo - 更新悬浮窗的函数
   */
  const saveClaudeSettings = async (
    getSettingsPath,
    writeFile,
    detectNetworkMode,
    updateFloatingWindowWithCurrentInfo
  ) => {
    if (!claudeSettingsContent.value.trim()) {
      showMessage('配置内容不能为空', 'error')
      return
    }

    // 验证JSON格式
    if (!jsonValid.value || jsonError.value) {
      showMessage('JSON格式错误，请修正后再保存', 'error')
      return
    }

    try {
      // 验证JSON格式
      const parsedContent = JSON.parse(claudeSettingsContent.value)

      savingClaudeSettings.value = true

      // 获取文件路径
      const pathResult = await getSettingsPath()
      if (!pathResult.success) {
        showMessage(`获取配置文件路径失败: ${pathResult.error}`, 'error')
        return
      }

      // 保存文件
      const saveResult = await writeFile(pathResult.data, parsedContent)
      if (saveResult.success) {
        showMessage('Claude settings.json 已保存', 'success')
        showClaudeSettingsDialog.value = false

        // 重新检测网络模式
        detectNetworkMode()

        // 更新悬浮窗
        updateFloatingWindowWithCurrentInfo()

        // 发送配置保存事件
        window.dispatchEvent(new CustomEvent('claude-config-saved'))
      } else {
        showMessage(`保存配置文件失败: ${saveResult.error}`, 'error')
      }
    } catch (err) {
      if (err instanceof SyntaxError) {
        showMessage('JSON格式错误，请检查配置内容', 'error')
        console.error('JSON解析错误:', err)
      } else {
        showMessage(`保存配置文件异常: ${err.message}`, 'error')
        console.error('保存Claude settings异常:', err)
      }
    } finally {
      savingClaudeSettings.value = false
    }
  }

  // 监听内容变化时更新编辑器（仅在需要时更新，比如撤销/重做操作）
  watch(claudeSettingsContent, (newContent, oldContent) => {
    if (showClaudeSettingsDialog.value && newContent !== oldContent) {
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
    showClaudeSettingsDialog,
    claudeSettingsContent,
    savingClaudeSettings,
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
    editClaudeSettings,
    saveClaudeSettings
  }
}
