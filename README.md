<div align="center">

<img src="apps/desktop/build/icon.png" alt="Desktop Starter" width="96" height="96" />

# Desktop Starter

A standalone Electron + React + TypeScript desktop app template, extracted from [DevHub](https://github.com/Delta1035/devhub): swap in your product identity with one command, then package, release and auto-update.

**English** · [简体中文](README.zh-CN.md)

[![CI](https://github.com/Delta1035/electron-desktop-template/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Delta1035/electron-desktop-template/actions/workflows/ci.yml)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-informational)
[![License](https://img.shields.io/github/license/Delta1035/electron-desktop-template)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](CONTRIBUTING.md)

![Electron](https://img.shields.io/badge/Electron-44-47848F?logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-11-F69220?logo=pnpm&logoColor=white)

[Create an app](#create-an-app) · [Package and release](#package-and-release) · [What's included](#whats-included) · [Contributing](CONTRIBUTING.md)

</div>

Targets Windows and Ubuntu; macOS keeps a compatible structure but is untested. The example UI and the docs are in Chinese.

<table>
  <tr>
    <td><img src="docs/assets/notes.png" alt="Notes example (light)" /></td>
    <td><img src="docs/assets/settings-dark.png" alt="Settings (dark)" /></td>
  </tr>
</table>

## Create an app

Requires Node >= 22 and pnpm 11.9.0.

```powershell
pnpm install --frozen-lockfile
# Preview the changes (writes nothing)
pnpm initialize --project-name my-tool --product-name "My Tool" --app-id com.example.mytool `
  --author "Example" --homepage https://example.com/my-tool --repository owner/my-tool
# When it looks right, run it again with the same arguments plus --yes to write the files
pnpm check
pnpm e2e
pnpm dev
```

| Option           | Used for                                                                                              |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| `--project-name` | Lowercase letters, digits, hyphens; root package, executable, install folder, installer, update cache |
| `--product-name` | Title bar, window title, tray, installer and shortcuts                                                |
| `--app-id`       | Reverse domain; data directory, theme storage key, Windows app identity. Must not be the default      |
| `--author`       | Package metadata and Linux package maintainer                                                         |
| `--homepage`     | Product homepage, http/https                                                                          |
| `--repository`   | Optional GitHub `owner/repo` used as the update feed; when omitted, updates and releases are off      |

Initialization rewrites only `app.config.json`, `package.json` and `apps/desktop/package.json`, structurally; all other code and packaging configuration read `app.config.json` at build time. Behavior:

- Missing or invalid options, a directory that is not this template, or identity files edited out of sync: every problem is listed, it exits with code 2 and writes nothing.
- Files are written to temporaries first, then replaced one by one; if a write fails, replaced files are restored and it exits with code 1 with recovery instructions.
- Running again with the same options changes nothing. Changing the appId of an initialized project needs `--allow-app-id-change`: a new appId means a new data directory and install identity, so existing installs will not be upgraded in place.

After initializing, rewrite this README, the copyright holder in `LICENSE`, and the screenshots in `docs/assets/` for your product.

Icons: replace `apps/desktop/build/*.svg`, then run `pnpm --filter @desktop/desktop icons`.

Linux CI runs `xvfb-run -a pnpm e2e`. If your VS Code terminal sets ELECTRON_RUN_AS_NODE, clear it before launching; E2E clears it automatically and uses a temporary data directory.

## Package and release

```powershell
pnpm --filter @desktop/desktop build:win     # NSIS installer; lets the user pick a folder and creates a <projectName> subfolder
pnpm --filter @desktop/desktop build:linux   # AppImage + deb
node scripts/verify-package.mjs              # verify artifact names and the update feed
```

- `pnpm identity` (part of `pnpm check`) verifies that every file agrees with `app.config.json` and scans for identifiers left over from the source app.
- `pnpm release patch|minor|major` first runs the release-mode check (no template defaults, repository required), then bumps the version, adds the feat / fix / perf commits since the previous tag to `CHANGELOG.md`, commits and tags. After `git push --follow-tags`, `release.yml` verifies the tag, identity, repository and changelog section, checks and packages on both platforms, and creates a draft Release whose notes are that section.
- Commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/); a `commit-msg` hook and CI check them (`scripts/commit-msg.mjs`).
- Without a repository, releasing is explicitly off; the update feed is never inferred from the git remote. Installers are not code-signed.

## What's included

Single instance, tray, custom title bar, automatic IPC, error channel, events, JSON storage, settings, themes, native file pickers, safe external links, shared UI, updates and E2E diagnostics. Notes is a self-contained example of the full path UI → AppApi → IPC → core → JSON storage. See [Architecture](docs/ARCHITECTURE.md) and [Removing the example](docs/REMOVE-EXAMPLE.md).

Copies of the template do not receive upstream fixes automatically. Internal packages are always named `@desktop/*` and need no renaming.

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=Delta1035/electron-desktop-template&type=Date)](https://star-history.com/#Delta1035/electron-desktop-template&Date)

## License

[MIT](LICENSE)
