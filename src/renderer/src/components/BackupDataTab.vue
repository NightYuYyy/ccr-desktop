<template>
  <div class="p-4 max-w-2xl">
    <h2 class="text-xl font-bold mb-6">数据备份与恢复</h2>

    <!-- WebDAV配置 -->
    <div class="bg-white p-6 rounded-lg shadow-sm mb-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold">WebDAV配置</h3>
        <el-switch v-model="useWebdav" active-text="启用WebDAV" />
      </div>

      <div v-if="useWebdav">
        <WebdavConfig ref="webdavConfigRef" />
      </div>

      <div v-else class="text-gray-600 text-sm">
        当前使用本地备份模式，备份文件将保存在应用程序数据目录中。
      </div>
    </div>

    <!-- 备份操作 -->
    <div class="bg-white p-6 rounded-lg shadow-sm mb-6">
      <div class="mb-6">
        <h3 class="text-lg font-semibold mb-3">创建备份</h3>
        <p class="text-gray-600 mb-4">
          创建当前配置和服务数据的完整备份。
          <span v-if="useWebdav"> 备份将通过WebDAV上传到配置的服务器。 </span>
          <span v-else> 备份文件将保存在应用程序数据目录中。 </span>
        </p>
        <el-button type="primary" size="large" :loading="isBackingUp" @click="backupData">
          立即创建备份
        </el-button>
      </div>

      <div class="mt-8 pt-6 border-t border-gray-200">
        <h3 class="text-lg font-semibold mb-3">备份管理</h3>
        <p class="text-gray-600 mb-4">管理现有的备份文件，查看历史备份或恢复到之前的配置状态。</p>
        <el-button type="info" @click="viewBackupList" :loading="loadingBackups">
          查看备份列表
        </el-button>
      </div>
    </div>

    <!-- 备份列表对话框 -->
    <el-dialog v-model="showBackupList" title="备份文件列表" width="600px">
      <div v-if="loadingBackups" class="text-center py-4">
        <el-skeleton :rows="3" animated />
      </div>

      <div v-else>
        <el-table :data="backupFiles" stripe style="width: 100%" max-height="400">
          <el-table-column prop="name" label="文件名" min-width="150" />
          <el-table-column prop="size" label="大小" width="100">
            <template #default="scope">
              {{ formatFileSize(scope.row.size) }}
            </template>
          </el-table-column>
          <el-table-column prop="modified" label="修改时间" width="180">
            <template #default="scope">
              {{ formatDate(scope.row.modified) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="scope">
              <el-button
                type="primary"
                size="small"
                @click="restoreBackup(scope.row)"
                :loading="restoringBackup === scope.row.path"
              >
                恢复
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div v-if="backupFiles.length === 0" class="text-center py-8 text-gray-500">
          暂无备份文件
        </div>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showBackupList = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import WebdavConfig from './WebdavConfig.vue'

const isBackingUp = ref(false)
const useWebdav = ref(false)
const webdavConfigRef = ref(null)
const showBackupList = ref(false)
const loadingBackups = ref(false)
const backupFiles = ref([])
const restoringBackup = ref(null)

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
  isBackingUp.value = true
  try {
    let result

    if (useWebdav.value) {
      // WebDAV备份
      result = await window.api.backupDataWebdav()
    } else {
      // 本地备份
      result = await window.api.backupData()
    }

    if (result.success) {
      ElMessage.success(`备份成功! ${result.message || `已保存至: ${result.backupPath}`}`)
    } else {
      ElMessage.error(`备份失败: ${result.error}`)
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
  showBackupList.value = true
  loadingBackups.value = true
  backupFiles.value = []

  try {
    let result

    if (useWebdav.value) {
      // 获取WebDAV备份列表
      result = await window.api.listWebdavBackups()
    } else {
      // 本地备份列表功能待实现
      ElMessage.info('本地备份列表功能正在开发中')
      return
    }

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

// 恢复备份（WebDAV功能待完善）
const restoreBackup = async (backupFile) => {
  if (useWebdav.value) {
    ElMessage.warning('WebDAV恢复功能正在开发中')
    return
  }

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
        // 恢复功能待实现
        ElMessage.info('恢复功能正在开发中')
      } catch (error) {
        ElMessage.error(`恢复失败: ${error.message}`)
      } finally {
        restoringBackup.value = null
      }
    })
    .catch(() => {
      // 用户取消操作
    })
}

onMounted(() => {
  // 可以在这里加载默认设置
})
</script>
