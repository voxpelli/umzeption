# Umzeption

Umzeption is a recursive extension for [Umzug](https://github.com/sequelize/umzug). Every npm package in your dependency tree — including the host app itself — can ship its own DB migrations and an `installSchema()`; Umzeption discovers them, groups them per package (dependencies first, host app last), and runs them through Umzug. Fresh databases install each schema and mark migrations as applied; existing databases run only what's pending.

[![neostandard javascript style](https://img.shields.io/badge/code_style-neostandard-7fffff?style=flat&labelColor=ff80ff)](https://github.com/neostandard/neostandard)
[![Module type: ESM](https://img.shields.io/badge/module%20type-esm-brightgreen)](https://github.com/voxpelli/badges-cjs-esm)
[![Types in JS](https://img.shields.io/badge/types_in_js-yes-brightgreen)](https://github.com/voxpelli/types-in-js)

This repository is an [npm workspaces](https://docs.npmjs.com/cli/using-npm/workspaces) monorepo. See each package's README for installation and usage.

## Packages

| Package | Description |
| --- | --- |
| [`umzeption`](./packages/umzeption) | Framework-agnostic core: dependency resolution, migration lookup, schema helpers, and the storage base. [![npm version](https://img.shields.io/npm/v/umzeption.svg?style=flat)](https://www.npmjs.com/package/umzeption) |
| [`umzeption-pg`](./packages/umzeption-pg) | PostgreSQL adapter: pg context, advisory locks, SQL parsing, and pg storage. [![npm version](https://img.shields.io/npm/v/umzeption-pg.svg?style=flat)](https://www.npmjs.com/package/umzeption-pg) |

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the monorepo layout, development setup, code style, and release process.

## License

[MIT](./LICENSE) © [Pelle Wessman](http://kodfabrik.se/)
