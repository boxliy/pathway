import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  dts: {
    resolve: ["@pathway/core", "@pathway/zh-cn-data"],
  },
  entry: ["ts/locales/zh-cn/pathway-zh-cn/src/index.ts"],
  format: ["esm", "cjs"],
  noExternal: ["@pathway/core", "@pathway/zh-cn-data", "china-division"],
  target: "es2022",
  tsconfig: "tsconfig.package.json",
});
