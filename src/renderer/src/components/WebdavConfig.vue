<template>
  <div class="webdav-config-form">
    <el-form
      ref="formRef"
      :model="webdavConfig"
      :rules="rules"
      label-width="120px"
      label-position="left"
    >
      <el-form-item label="服务器地址" prop="server">
        <el-input v-model="webdavConfig.server" placeholder="例如: https://webdav.example.com" />
      </el-form-item>

      <el-form-item label="用户名" prop="username">
        <el-input v-model="webdavConfig.username" placeholder="WebDAV用户名" />
      </el-form-item>

      <el-form-item label="密码" prop="password">
        <el-input
          v-model="webdavConfig.password"
          type="password"
          placeholder="WebDAV密码（为安全考虑，每次需重新输入）"
          show-password
          clearable
        />
      </el-form-item>

      <el-form-item label="远程路径" prop="remotePath">
        <el-input v-model="webdavConfig.remotePath" placeholder="例如: /ccr-backups" />
      </el-form-item>

      <el-form-item>
        <el-button type="primary" :loading="saving" @click="saveConfig"> 保存配置 </el-button>
        <el-button :loading="testing" style="margin-left: 12px" @click="testConnection">
          测试连接
        </el-button>
      </el-form-item>
    </el-form>

    <el-alert
      v-if="testResult"
      :type="testResult.success ? 'success' : 'error'"
      :title="testResult.message"
      show-icon
      closable
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

const formRef = ref(null)
const saving = ref(false)
const testing = ref(false)
const testResult = ref(null)

const webdavConfig = ref({
  server: '',
  username: '',
  password: '',
  remotePath: '/ccr-backups'
})

const rules = {
  server: [
    { required: true, message: '请输入服务器地址', trigger: 'blur' },
    { type: 'url', message: '请输入有效的URL', trigger: 'blur' }
  ],
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  remotePath: [{ required: true, message: '请输入远程路径', trigger: 'blur' }]
}

// 加载现有配置
const loadConfig = async () => {
  try {
    const result = await window.api.getWebdavConfig()
    if (result.success && result.data) {
      const config = result.data
      webdavConfig.value = {
        ...webdavConfig.value,
        ...config,
        // 如果密码是掩码，清空输入框让用户重新输入
        password: config.password === '••••••••' ? '' : config.password
      }

      // 如果有保存的配置，显示提示
      if (config.server) {
        console.log('[加载配置] WebDAV服务器:', config.server)
        console.log('[加载配置] WebDAV启用状态:', config.enabled)
      }
    }
  } catch (error) {
    console.error('加载WebDAV配置失败:', error)
  }
}

// 保存配置
const saveConfig = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    // 确保传递的是普通对象而不是Vue响应式对象
    const configData = JSON.parse(JSON.stringify(webdavConfig.value))
    const result = await window.api.setWebdavConfig(configData)
    if (result.success) {
      ElMessage.success('WebDAV配置保存成功')
    } else {
      ElMessage.error(`保存失败: ${result.error}`)
    }
  } catch (error) {
    ElMessage.error(`保存异常: ${error.message}`)
  } finally {
    saving.value = false
  }
}

// 测试连接
const testConnection = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  testing.value = true
  testResult.value = null

  try {
    // 先保存配置再测试 - 确保传递普通对象
    const configData = JSON.parse(JSON.stringify(webdavConfig.value))
    const saveResult = await window.api.setWebdavConfig(configData)
    if (!saveResult.success) {
      ElMessage.error(`保存配置失败: ${saveResult.error}`)
      testing.value = false
      return
    }

    const result = await window.api.testWebdavConnection()
    testResult.value = {
      success: result.success,
      message: result.success ? '连接成功' : result.error
    }

    if (result.success) {
      ElMessage.success('WebDAV连接测试成功')
    } else {
      ElMessage.error(`连接测试失败: ${result.error}`)
    }
  } catch (error) {
    testResult.value = {
      success: false,
      message: `连接测试异常: ${error.message}`
    }
    ElMessage.error(`连接测试异常: ${error.message}`)
  } finally {
    testing.value = false
  }
}

onMounted(() => {
  loadConfig()
})
</script>

<style scoped>
.webdav-config-form {
  padding: 0;
}

:deep(.el-form-item__label) {
  color: #2c3e50 !important;
  font-weight: 500;
  font-size: 14px;
}

:deep(.el-input__wrapper) {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
}

:deep(.el-button) {
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s ease;
}

:deep(.el-button--primary) {
  background: linear-gradient(135deg, #409eff 0%, #667eea 100%);
  border: none;
}

:deep(.el-button--primary:hover) {
  background: linear-gradient(135deg, #337ecc 0%, #5a67d8 100%);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(64, 158, 255, 0.3);
}

:deep(.el-button:not(.el-button--primary)) {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  color: #495057;
}

:deep(.el-button:not(.el-button--primary):hover) {
  background: #e9ecef;
  border-color: #adb5bd;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

:deep(.el-form-item) {
  margin-bottom: 20px;
}

:deep(.el-alert) {
  border-radius: 8px;
  margin-top: 16px;
}
</style>
