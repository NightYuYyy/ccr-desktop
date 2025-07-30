import { createApp } from 'vue'
import FloatingWindow from './views/FloatingWindow.vue'

// 创建专门用于悬浮窗的应用实例
const app = createApp(FloatingWindow)
app.mount('#floating-window')
