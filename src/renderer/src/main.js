import './assets/main.css'
// UnoCSS 虚拟样式文件
import 'virtual:uno.css'
// Element Plus 样式文件
import 'element-plus/dist/index.css'

import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import FloatingWindow from './views/FloatingWindow.vue'

// 创建路由
const routes = [
  { path: '/', component: App },
  { path: '/floating', component: FloatingWindow }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

const app = createApp(App)
app.use(router)
app.mount('#app')
