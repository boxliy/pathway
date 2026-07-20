import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));

const run = (command, args, cwd) => {
  try {
    return execFileSync(command, args, {
      cwd,
      encoding: "utf8",
      env: { ...process.env, CI: "true" },
      stdio: "pipe",
    });
  } catch (error) {
    const stdout = error.stdout?.toString().trim();
    const stderr = error.stderr?.toString().trim();
    const output = [stdout && `stdout:\n${stdout}`, stderr && `stderr:\n${stderr}`]
      .filter(Boolean)
      .join("\n\n");
    throw new Error(`${command} ${args.join(" ")} failed${output ? `\n\n${output}` : ""}`, {
      cause: error,
    });
  }
};

test("a fresh Vite project installs the current Git commit and builds", async () => {
  const commit = run("git", ["rev-parse", "HEAD"], repositoryRoot).trim();
  const remoteParent = await mkdtemp(join(tmpdir(), "pathway-git-remote-"));
  const remote = join(remoteParent, "pathway.git");
  const consumer = await mkdtemp(join(tmpdir(), "pathway-vite-consumer-"));
  run("git", ["clone", "--bare", repositoryRoot, remote], repositoryRoot);
  await mkdir(join(consumer, "src"));

  await writeFile(
    join(consumer, "package.json"),
    `${JSON.stringify(
      {
        name: "pathway-vite-consumer",
        private: true,
        type: "module",
        scripts: { build: "tsc --noEmit && vite build" },
        dependencies: {
          "@pathway/zh-cn": `git+file://${remote}#${commit}`,
        },
        devDependencies: { typescript: "5.9.3", vite: "7.3.6" },
        packageManager: "pnpm@10.15.1",
      },
      null,
      2,
    )}\n`,
  );
  await writeFile(
    join(consumer, "index.html"),
    '<!doctype html><html><body><div id="app"></div><script type="module" src="/src/main.ts"></script></body></html>\n',
  );
  await writeFile(
    join(consumer, "tsconfig.json"),
    `${JSON.stringify(
      {
        compilerOptions: {
          lib: ["ES2022", "DOM"],
          module: "ESNext",
          moduleResolution: "Bundler",
          strict: true,
          target: "ES2022",
        },
        include: ["src"],
      },
      null,
      2,
    )}\n`,
  );
  await writeFile(
    join(consumer, "src/main.ts"),
    `import { parseZhAddress } from "@pathway/zh-cn";

const result = parseZhAddress("广东省深圳市南山区科技园");
document.querySelector<HTMLDivElement>("#app")!.textContent = result.region?.district?.name ?? "";
`,
  );

  run("pnpm", ["install", "--no-frozen-lockfile"], consumer);
  run("pnpm", ["run", "build"], consumer);

  const html = await readFile(join(consumer, "dist/index.html"), "utf8");
  assert.match(html, /assets\/index-[^"']+\.js/);
});

test("packed artifact contains only public package files", async () => {
  const destination = await mkdtemp(join(tmpdir(), "pathway-pack-"));
  run("pnpm", ["pack", "--pack-destination", destination], repositoryRoot);

  const archive = join(destination, "pathway-zh-cn-0.1.0.tgz");
  const entries = run("tar", ["-tzf", archive], repositoryRoot)
    .trim()
    .split("\n")
    .sort();

  assert.deepEqual(entries, [
    "package/LICENSE",
    "package/README.md",
    "package/dist/index.d.mts",
    "package/dist/index.d.ts",
    "package/dist/index.js",
    "package/dist/index.mjs",
    "package/package.json",
  ]);
});
