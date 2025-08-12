<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <!-- 页面标题 -->
    <div class="mb-6">
      <h1 class="text-xl font-semibold text-gray-900 mb-2">数据备份与恢复</h1>
      <p class="text-gray-600">安全备份您的配置数据，随时恢复到任意时间点</p>
    </div>

    <!-- WebDAV配置卡片 -->
    <div class="bg-white border border-gray-200 rounded-lg p-4 mb-4">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="text-lg font-medium text-gray-900 flex items-center gap-2">
            <span>🌐</span>
            WebDAV 配置
          </h3>
          <p class="text-sm text-gray-500 mt-1">配置远程WebDAV服务器进行云端备份</p>
        </div>
      </div>

      <div class="mt-4">
        <WebdavConfig ref="webdavConfigRef" />
      </div>
    </div>

    <!-- 备份操作区域 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- 创建备份卡片 -->
      <div class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <span class="text-blue-600">📦</span>
          </div>
          <div>
            <h3 class="text-lg font-medium text-gray-900">创建备份</h3>
            <p class="text-sm text-gray-500">
              创建当前配置的完整备份
              <span
                class="inline-block bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full ml-1"
              >
                WebDAV云端备份
              </span>
            </p>
          </div>
        </div>
        <el-button type="primary" :loading="isBackingUp" class="w-full" @click="backupData">
          {{ isBackingUp ? '备份中...' : '立即创建备份' }}
        </el-button>
      </div>

      <!-- 管理备份卡片 -->
      <div class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
            <span class="text-gray-600">📋</span>
          </div>
          <div>
            <h3 class="text-lg font-medium text-gray-900">备份管理</h3>
            <p class="text-sm text-gray-500">查看历史备份，恢复到之前的配置状态</p>
          </div>
        </div>
        <el-button type="info" :loading="loadingBackups" class="w-full" @click="viewBackupList">
          {{ loadingBackups ? '加载中...' : '查看备份列表' }}
        </el-button>
      </div>
    </div>

    <!-- 备份列表对话框 -->
    <el-dialog v-model="showBackupList" title="备份文件列表" width="800px">
      <div v-if="loadingBackups" class="text-center py-8">
        <el-skeleton :rows="4" animated />
      </div>

      <div v-else>
        <div v-if="backupFiles.length === 0" class="text-center py-12">
          <div class="text-gray-400 mb-4">
            <span class="text-4xl">📁</span>
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">暂无备份文件</h3>
          <p class="text-gray-500">创建您的第一个备份文件以确保数据安全</p>
        </div>

        <div v-else>
          <el-table :data="backupFiles" stripe style="width: 100%" max-height="400">
            <el-table-column prop="name" label="文件名" min-width="200">
              <template #default="scope">
                <div class="flex items-center gap-2">
                  <span class="text-gray-400">📄</span>
                  <span class="text-sm font-mono">{{ scope.row.name }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="size" label="大小" width="100">
              <template #default="scope">
                {{ formatFileSize(scope.row.size) }}
              </template>
            </el-table-column>
            <el-table-column prop="modified" label="修改时间" width="180">
              <template #default="scope">
                <div class="flex items-center gap-1">
                  <span class="text-gray-400 text-xs">🕐</span>
                  <span class="text-sm">{{ formatDate(scope.row.modified) }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120">
              <template #default="scope">
                <el-button
                  type="primary"
                  size="small"
                  :loading="restoringBackup === scope.row.path"
                  @click="restoreBackup(scope.row)"
                >
                  {{ restoringBackup === scope.row.path ? '恢复中...' : '恢复' }}
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end">
          <el-button @click="showBackupList = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import WebdavConfig from './WebdavConfig.vue'

const isBackingUp = ref(false)
const webdavConfigRef = ref(null)
const showBackupList = ref(false)
const loadingBackups = ref(false)
const backupFiles = ref([])
const restoringBackup = ref(null)

// 检查WebDAV配置是否有效
const isWebdavConfigValid = (config) => {
  return config && config.server && config.username && config.password
}

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 格式化日期
const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
}

// 备份数据
const backupData = async () => {
  // 检查WebDAV配置是否有效
  const result = await window.api.getWebdavConfig()
  if (!result.success || !isWebdavConfigValid(result.data)) {
    ElMessage.warning('请先完善WebDAV配置信息')
    return
  }

  isBackingUp.value = true
  try {
    // WebDAV备份
    const backupResult = await window.api.backupDataWebdav()

    if (backupResult.success) {
      ElMessage.success(
        `备份成功! ${backupResult.message || `已保存至: ${backupResult.backupPath}`}`
      )
    } else {
      ElMessage.error(`备份失败: ${backupResult.error}`)
    }
  } catch (error) {
    ElMessage.error(`备份异常: ${error.message}`)
    console.error('备份异常:', error)
  } finally {
    isBackingUp.value = false
  }
}

// 查看备份列表
const viewBackupList = async () => {
  // 检查WebDAV配置是否有效
  const configResult = await window.api.getWebdavConfig()
  if (!configResult.success || !isWebdavConfigValid(configResult.data)) {
    ElMessage.warning('请先完善WebDAV配置信息')
    return
  }

  showBackupList.value = true
  loadingBackups.value = true
  backupFiles.value = []

  try {
    // 获取WebDAV备份列表
    const result = await window.api.listWebdavBackups()

    if (result.success) {
      backupFiles.value = result.files || []
    } else {
      ElMessage.error(`获取备份列表失败: ${result.error}`)
    }
  } catch (error) {
    ElMessage.error(`获取备份列表异常: ${error.message}`)
    console.error('获取备份列表异常:', error)
  } finally {
    loadingBackups.value = false
  }
}

// 恢复备份
const restoreBackup = async (backupFile) => {
  ElMessageBox.confirm(
    `确定要恢复备份文件 "${backupFile.name}" 吗？这将覆盖当前配置。`,
    '确认恢复',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )
    .then(async () => {
      restoringBackup.value = backupFile.path
      try {
        const result = await window.api.restoreDataFromWebdav(backupFile.path)
        if (result.success) {
          ElMessage.success('数据恢复成功')
        } else {
          ElMessage.error(`恢复失败: ${result.error}`)
        }
      } catch (error) {
        ElMessage.error(`恢复异常: ${error.message}`)
      } finally {
        restoringBackup.value = null
      }
    })
    .catch(() => {
      // 用户取消操作
    })
}
</script>

<style scoped>
/* 保持简洁的样式，主要使用Tailwind CSS类 */
</style>
