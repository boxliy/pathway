# Pathway Git Package Design

## Goal

Make the Pathway repository installable directly from a fixed Git commit as
`@pathway/zh-cn`. A consuming pnpm and Vite project must be able to import the
package without knowing Pathway's workspace layout or configuring aliases.

The repository will not commit generated `dist` files. Git dependency
installation will run the package's `prepare` lifecycle script and create the
distribution before the consumer uses it.

## Public Package

The repository root becomes the only public package:

```json
{
  "name": "@pathway/zh-cn",
  "version": "0.1.0"
}
```

Its package metadata will expose only compiled files from the root `dist`
directory:

- `main` for CommonJS consumers;
- `module` for ESM-aware tooling;
- `types` for TypeScript declarations;
- conditional `exports` for ESM, CommonJS, and types;
- `files` restricted to `dist` and standard package documentation.

The root package will have no runtime dependency on Pathway workspace package
names. This prevents `workspace:*` ranges or unpublished internal packages from
leaking into consuming projects.

ZTOMS and other consumers will pin an immutable commit:

```json
{
  "dependencies": {
    "@pathway/zh-cn": "github:boxliy/pathway#325e3251585a4d2400df92f9d99ec150e640d9cd"
  }
}
```

## Internal Workspace

The current TypeScript source layout remains in place to keep the change
surgical:

```text
ts/core/pathway-core
ts/locales/zh-cn/pathway-zh-cn-data
ts/locales/zh-cn/pathway-zh-cn
```

The internal packages remain useful for source organization and unit tests but
are not public installation units. They will be marked private. The internal
Chinese implementation package will be renamed so it does not duplicate the
root package name.

No parser behavior, public parser function, data format, or test expectation is
changed by this packaging work.

## Build and Install Lifecycle

A root `tsup` configuration will use the existing Chinese parser entry point
and emit ESM, CommonJS, and declaration outputs into root `dist`.

The bundle will include:

- `@pathway/core`;
- `@pathway/zh-cn-data`;
- the pinned `china-division` region data.

The compiled JavaScript must not retain imports or `require` calls for either
internal Pathway package. The approximately 2.42 MB region dataset is expected
to make the final package comparatively large; that is accepted in exchange
for a self-contained Git package.

The root lifecycle will distinguish normal repository work from Git package
preparation:

- `build` continues to build the workspace and the public root package;
- `build:package` builds only the public root distribution;
- `prepare` runs `build:package` during Git dependency installation.

The existing `.gitignore` rule for `dist/` remains in force. Generated output
must not be committed.

Consumers that disable lifecycle scripts with `--ignore-scripts` are not
supported because that prevents `prepare` from generating the package output.

## Package Contents

The package allowlist will prevent monorepo source, tests, and workspace
configuration from becoming part of the installed public package. The packed
artifact should contain only:

- package metadata;
- license and README documentation;
- compiled JavaScript;
- TypeScript declarations.

The Git repository still contains all workspace sources because pnpm needs them
while running `prepare`. Only the artifact made available to the consumer is
restricted.

## Verification

Existing unit tests remain the behavioral regression suite. CI will also add a
consumer smoke test with these steps:

1. perform a frozen install of the Pathway workspace;
2. run the existing workspace build and tests;
3. create a clean external fixture that depends on the current repository as a
   Git dependency pinned to the checked-out commit;
4. run a fresh `pnpm install` in the fixture and confirm `prepare` creates the
   distribution;
5. import and call `parseZhAddress` from `@pathway/zh-cn` in a minimal Vite and
   TypeScript application;
6. run a Vite production build;
7. confirm no unresolved `@pathway/core` or `@pathway/zh-cn-data` reference is
   present in the installed package output;
8. inspect `pnpm pack` output and confirm generated `dist` files are included
   while workspace sources and tests are excluded;
9. confirm `git status` contains no generated `dist` changes.

The Git dependency smoke test will use a local Git URL pointing at the current
checked-out commit. This exercises Git installation and `prepare` without
depending on whether a pull-request commit is already reachable from the
public GitHub repository.

## Documentation

The README will document:

- installation with a full commit SHA;
- the public import path and a minimal parser example;
- the requirement to allow lifecycle scripts;
- the reason generated `dist` files are absent from the Git tree.

## Success Criteria

The work is complete when all of the following are true:

- the repository root identifies as `@pathway/zh-cn`;
- `dist` is absent from committed files;
- installing the repository from a fixed Git commit runs `prepare` and creates
  usable compiled output;
- the public bundle contains core logic and region data without unpublished
  workspace dependencies;
- existing unit tests pass;
- a clean pnpm consumer completes a Vite production build;
- package-content checks exclude workspace sources and tests.
