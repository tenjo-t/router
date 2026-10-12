import { defineConfig } from "tsdown";

export default defineConfig({
  entry: { index: "./src/router.ts" },
  dts: true,
});
