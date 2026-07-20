# pathway

Multilingual address and contact parsing SDK.

## Install from Git

Pin a full commit SHA so dependency updates are intentional:

```json
{
  "dependencies": {
    "@pathway/zh-cn": "github:boxliy/pathway#FULL_40_CHARACTER_COMMIT_SHA"
  }
}
```

Pathway builds its TypeScript distribution during the Git dependency
`prepare` lifecycle. Generated `dist` files are deliberately not committed to
the repository, so consumers must not install with `--ignore-scripts`.

## Usage

```ts
import { parseZhAddress } from "@pathway/zh-cn";

const result = parseZhAddress("广东省深圳市南山区科技园");
console.log(result.region?.district?.name);
```

The repository is organized as a language-family workspace. Version 1 starts
with TypeScript and leaves Rust and Go as future targets.

## Workspace

```text
ts/
  core/pathway-core
  locales/zh-cn/pathway-zh-cn-data
  locales/zh-cn/pathway-zh-cn
rust/
go/
```

The workspace packages are private implementation details. The repository root
is the installable `@pathway/zh-cn` package and bundles the core implementation
and Chinese region data into a self-contained distribution.

## License

MIT
