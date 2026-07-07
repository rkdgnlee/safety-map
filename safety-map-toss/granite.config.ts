import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "safety-map",
  brand: {
    displayName: "우리동네 안전지도", // 화면에 노출될 앱의 한글 이름으로 바꿔주세요.
    primaryColor: "#0064ff", // 화면에 노출될 앱의 기본 색상으로 바꿔주세요.
    icon: "https://static.toss.im/appsintoss/39707/c6467924-1c47-4b46-9ae0-81a76458dd6b.png", 
  },
  web: {
    host: "localhost",
    port: 5173,
    commands: {
      dev: "vite dev",
      build: "vite build",
    },
  },
  permissions: [],
  outdir: "dist",
});
