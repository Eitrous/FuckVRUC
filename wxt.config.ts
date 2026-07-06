import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  srcDir: 'src',
  manifest: {
    manifest_version: 3,
    name: "FuckVRUC",
    version: "0.0.1",
    description: "FuckVRUC",
    author: {
      email: "me@0x3f.io",
    },
    permissions: [
        "storage",
        "tabs",
        "cookies",
    ],
    host_permissions: [
        "https://v.ruc.edu.cn/*",
        "https://my.ruc.edu.cn/*",
        "https://jw.ruc.edu.cn/*"
    ],
    action: {
        default_popup: "popup.html",
        default_icon: "icon/48.png"
    },
    icons: {
        16: "icon/16.png",
        48: "icon/48.png",
        128: "icon/128.png"
    },
    content_scripts: [
        {
            matches: ["https://v.ruc.edu.cn/*"],
            js: ["content-scripts/content.js"]
        }
    ]
  },
});
