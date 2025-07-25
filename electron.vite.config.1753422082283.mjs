// electron.vite.config.mjs
import { resolve } from "path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import vue from "@vitejs/plugin-vue";
import UnoCSS from "unocss/vite";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";
var __electron_vite_injected_dirname = "C:\\Users\\zhengjiyong\\code\\ccr-desktop";
var electron_vite_config_default = defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    build: {
      rollupOptions: {
        input: {
          main: resolve(__electron_vite_injected_dirname, "src/renderer/index.html"),
          floating: resolve(__electron_vite_injected_dirname, "src/renderer/floating.html")
        }
      }
    },
    resolve: {
      alias: {
        "@renderer": resolve("src/renderer/src")
      }
    },
    plugins: [
      vue(),
      // UnoCSS 插件 - 原子化CSS框架
      UnoCSS(),
      // Element Plus 自动导入插件
      AutoImport({
        resolvers: [ElementPlusResolver()]
      }),
      Components({
        resolvers: [ElementPlusResolver()]
      })
    ]
  }
});
export {
  electron_vite_config_default as default
};
