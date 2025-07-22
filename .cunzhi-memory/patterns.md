# 常用模式和最佳实践

- Electron IPC序列化问题：Vue响应式对象无法直接通过IPC传递，会报"An object could not be cloned"错误。解决方案是使用 JSON.parse(JSON.stringify(obj)) 将响应式对象转换为普通对象后再传递给window.api调用。
