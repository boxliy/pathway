import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";

const repositoryRoot = new URL("..", import.meta.url);

test("public build is self-contained and callable", async () => {
  execFileSync("pnpm", ["run", "build:package"], {
    cwd: repositoryRoot,
    stdio: "pipe",
  });

  const [esm, types] = await Promise.all([
    readFile(new URL("../dist/index.mjs", import.meta.url), "utf8"),
    readFile(new URL("../dist/index.d.ts", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(esm, /@pathway\/(?:core|zh-cn-data)/);
  assert.doesNotMatch(esm, /from ["']china-division/);
  assert.doesNotMatch(types, /@pathway\/(?:core|zh-cn-data)/);

  const { parseZhAddress } = await import("../dist/index.mjs");
  const result = parseZhAddress("广东省深圳市南山区科技园");

  assert.equal(result.region?.province?.name, "广东省");
  assert.equal(result.region?.city?.name, "深圳市");
  assert.equal(result.region?.district?.name, "南山区");
});
