import { defineConfig } from "vite";
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (
            [
              "/@codemirror/",
              "/@lezer/",
              "/style-mod/",
              "/w3c-keyname/",
              "/crelt/",
            ].some((part) => id.includes(part))
          )
            return "editor";
          if (id.includes("/zod/")) return "validation";
        },
      },
    },
  },
});
