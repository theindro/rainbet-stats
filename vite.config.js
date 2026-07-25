import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { rainbetCurlProxyPlugin } from "./vite-rainbet-proxy.js";

export default defineConfig({
  plugins: [react(), rainbetCurlProxyPlugin()],
});
