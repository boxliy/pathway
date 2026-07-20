import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readJson = async (relativePath) =>
  JSON.parse(await readFile(new URL(`../${relativePath}`, import.meta.url), "utf8"));

test("repository root exposes the compiled @pathway/zh-cn package", async () => {
  const packageJson = await readJson("package.json");

  assert.equal(packageJson.name, "@pathway/zh-cn");
  assert.equal(packageJson.version, "0.1.0");
  assert.equal(packageJson.private, undefined);
  assert.deepEqual(packageJson.files, ["dist"]);
  assert.equal(packageJson.main, "./dist/index.js");
  assert.equal(packageJson.module, "./dist/index.mjs");
  assert.equal(packageJson.types, "./dist/index.d.ts");
  assert.deepEqual(packageJson.exports, {
    ".": {
      types: "./dist/index.d.ts",
      import: "./dist/index.mjs",
      require: "./dist/index.js",
      default: "./dist/index.mjs",
    },
  });
  assert.equal(packageJson.scripts.prepare, "pnpm run build:package");
});

test("workspace packages are private implementation details", async () => {
  const [core, data, implementation] = await Promise.all([
    readJson("ts/core/pathway-core/package.json"),
    readJson("ts/locales/zh-cn/pathway-zh-cn-data/package.json"),
    readJson("ts/locales/zh-cn/pathway-zh-cn/package.json"),
  ]);

  assert.equal(core.private, true);
  assert.equal(data.private, true);
  assert.equal(implementation.private, true);
  assert.equal(implementation.name, "@pathway/zh-cn-impl");
});
