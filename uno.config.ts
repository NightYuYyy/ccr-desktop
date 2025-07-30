import { defineConfig, presetWind3 } from 'unocss'

export default defineConfig({
  // 预设配置
  presets: [
    presetWind3() // Tailwind/WindiCSS 兼容的工具类
  ],

  // 自定义规则
  rules: [
    // 自定义规则示例
    [/^m-(\d+)$/, ([, d]) => ({ margin: `${d}px` })]
  ],

  // 快捷方式
  shortcuts: [
    // 基础按钮样式
    [
      'btn',
      'px-4 py-1 rounded inline-block bg-teal-600 text-white cursor-pointer hover:bg-teal-700 disabled:cursor-default disabled:bg-gray-600 disabled:opacity-50'
    ],
    ['btn-primary', 'bg-blue-500 hover:bg-blue-600'],
    ['btn-success', 'bg-green-500 hover:bg-green-600'],
    ['btn-warning', 'bg-yellow-500 hover:bg-yellow-600'],
    ['btn-danger', 'bg-red-500 hover:bg-red-600'],

    // 布局相关
    ['flex-center', 'flex justify-center items-center'],
    ['flex-col-center', 'flex flex-col justify-center items-center'],

    // 卡片样式
    ['card', 'bg-white rounded-lg shadow-md p-6'],
    ['card-hover', 'hover:shadow-lg transition-shadow duration-200']
  ],

  // 主题配置
  theme: {
    colors: {
      // 自定义颜色，与Element Plus保持一致
      primary: '#409eff',
      success: '#67c23a',
      warning: '#e6a23c',
      danger: '#f56c6c',
      info: '#909399'
    },
    breakpoints: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px'
    }
  },

  // 安全列表 - 确保这些类始终包含
  safelist: ['btn', 'card', 'flex-center']
})
