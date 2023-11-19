# idlization

Helper classes and methods for implementing the idle-until-urgent pattern, based on TypeScript, and SSR compatible.

[![NPM version](https://img.shields.io/npm/v/idlization?color=a1b858&label=)](https://www.npmjs.com/package/idlization)

## Features

- All features of [GoogleChromeLabs/idlize](https://github.com/GoogleChromeLabs/idlize)
- TypeScript supported
- SSR compatible
- `IdlePromise` based on [generator function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*)

## References

- [Idle Until Urgent](https://philipwalton.com/articles/idle-until-urgent/)
- [Measure performance with the RAIL model](https://web.dev/rail/#response:-process-events-in-under-50ms)
- [Generators for idle-until-urgent](https://til.florianpellet.com/2020/02/29/Generator-idle-promise/)

## Build & Publish

- `npm run build`
- `npx changeset`
- `npx changeset version`
- `git commit`
- `npx changeset publish`
- `git push --follow-tags`

> [`changeset` prerelease doc](https://github.com/changesets/changesets/blob/main/docs/prereleases.md)

## License

[MIT](./LICENSE) License © 2023 [Yuns](https://github.com/yunsii)
