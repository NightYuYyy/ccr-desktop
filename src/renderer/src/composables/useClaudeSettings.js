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

  /**
   * JSON语法高亮
   * @param {string} jsonString - JSON字符串
   * @returns {string} 高亮后的HTML
   */
  const highlightJson = (jsonString) => {
    if (!jsonString) return ''

    return jsonString
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/(".*?"):/g, '<span class="json-key">$1</span>:')
      .replace(/:\s*(true|false|null)/g, ': <span class="json-boolean">$1</span>')
      .replace(/:\s*(-?\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
      .replace(/:\s*"([^"]*)"/g, ': <span class="json-string">"$1"</span>')
      .replace(/(\{|\}|\[|\]|,)/g, '<span class="json-bracket">$1</span>')
  }

  /**
   * 更新JSON编辑器内容
   */
  const updateJsonEditor = () => {
    if (jsonEditor.value) {
      const highlighted = highlightJson(claudeSettingsContent.value)
      jsonEditor.value.innerHTML =
        highlighted || '<span class="json-placeholder">请输入有效的JSON配置...</span>'
    }
  }

  /**
   * 处理JSON输入
   * @param {Event} event - 输入事件
   */
  const handleJsonInput = (event) => {
    const content = event.target.innerText || event.target.textContent
    claudeSettingsContent.value = content
    validateJson()
  }

  /**
   * 处理JSON粘贴
   * @param {Event} event - 粘贴事件
   */
  const handleJsonPaste = (event) => {
    event.preventDefault()
    const pastedText = event.clipboardData.getData('text')
    document.execCommand('insertText', false, pastedText)
    setTimeout(() => {
      claudeSettingsContent.value = jsonEditor.value.innerText || jsonEditor.value.textContent
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
      document.execCommand('insertText', false, '  ')
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
      claudeSettingsContent.value = formatted
      updateJsonEditor()
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
        claudeSettingsContent.value = JSON.stringify(readResult.data, null, 2)
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

  // 监听内容变化时更新编辑器
  watch(claudeSettingsContent, () => {
    if (showClaudeSettingsDialog.value) {
      setTimeout(() => {
        updateJsonEditor()
      }, 0)
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
    highlightJson,
    updateJsonEditor,
    handleJsonInput,
    handleJsonPaste,
    handleJsonKeydown,
    validateJson,
    formatJson,
    editClaudeSettings,
    saveClaudeSettings
  }
}
