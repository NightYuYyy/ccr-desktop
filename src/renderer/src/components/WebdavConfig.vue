<template>
  <div class="webdav-config-form">
    <el-form
      :model="webdavConfig"
      :rules="rules"
      ref="formRef"
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
          placeholder="WebDAV密码"
          show-password
        />
      </el-form-item>

      <el-form-item label="远程路径" prop="remotePath">
        <el-input v-model="webdavConfig.remotePath" placeholder="例如: /ccr-backups" />
      </el-form-item>

      <el-form-item>
        <el-button type="primary" @click="saveConfig" :loading="saving"> 保存配置 </el-button>
        <el-button @click="testConnection" :loading="testing" style="margin-left: 12px">
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
      webdavConfig.value = { ...webdavConfig.value, ...result.data }
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
    const result = await window.api.setWebdavConfig(webdavConfig.value)
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
    // 先保存配置再测试
    const saveResult = await window.api.setWebdavConfig(webdavConfig.value)
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
  padding: 20px 0;
}
</style>
