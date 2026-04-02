import devtools from "solid-devtools/vite";
import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [devtools(), tsconfigPaths(), solidPlugin()],
  worker: {
    format: "es",
    plugins: () => [tsconfigPaths()],
  },
  server: {
    port: 3000,
  },
  build: {
    target: "esnext",
    rollupOptions: {
      input: ["index.html", "about.html", "privacy.html", "terms.html"],
    },
  },
});
