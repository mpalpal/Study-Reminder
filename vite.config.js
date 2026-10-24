import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    // オフライン対応とホーム画面追加（PWA）。Service Worker とマニフェストを自動生成する。
    VitePWA({
      registerType: "autoUpdate", // 新しい版をデプロイしたら、次回起動時に自動で切り替わる
      filename: "service-worker.js",
      includeAssets: ["icons/icon340.jpeg"],
      manifest: {
        name: "Study Reminder",
        short_name: "Study Reminder",
        start_url: "/",
        display: "standalone",
        background_color: "#061a2b",
        theme_color: "#061a2b",
        icons: [{ src: "/icons/icon340.jpeg", sizes: "340x340", type: "image/jpeg" }],
      },
      workbox: {
        globPatterns: ["**/*.{html,js,css,png,jpeg}"],
        navigateFallbackDenylist: [/^\/api\//], // 同期 API はキャッシュしない
      },
    }),
  ],
});
