# flowshot

Flow-based visual regression dashboard for Playwright.
One command, one HTML file — screenshots connected as user flows with diff slider.

![Dashboard Dark](https://raw.githubusercontent.com/thingnoy/flowshot/main/assets/dashboard-dark.png)

## Why

Existing visual regression tools show screenshots as flat galleries. Flowshot shows them as **user flows** — screens connected with arrows, so you see the journey, not just the pages.

- No server, no account — generates a single HTML file
- Works with your existing Playwright snapshots
- Diff mode with drag slider to compare expected vs actual
- Dark/light theme, sidebar navigation, lightbox zoom

## Quick Start

```bash
# 1. Install
npm i -D flowshot

# 2. Create config
npx flowshot init

# 3. Edit flowshot.config.json — define your flows

# 4. Run Playwright visual tests
npx playwright test e2e/visual.spec.ts

# 5. Generate report
npx flowshot
```

## Screenshots

### Flow View — Dark Theme

![Dashboard Dark](https://raw.githubusercontent.com/thingnoy/flowshot/main/assets/dashboard-dark.png)

### Flow View — Light Theme

![Dashboard Light](https://raw.githubusercontent.com/thingnoy/flowshot/main/assets/dashboard-light.png)

### Single Flow Detail

![Flow Detail](https://raw.githubusercontent.com/thingnoy/flowshot/main/assets/flow-detail.png)

### Diff Mode

![Diff Mode](https://raw.githubusercontent.com/thingnoy/flowshot/main/assets/diff-mode.png)

## Config

`flowshot.config.json`:

```json
{
  "snapshotDir": "e2e/visual.spec.ts-snapshots",
  "testResultsDir": "test-results",
  "platform": "chromium-darwin",
  "views": ["mobile", "desktop"],
  "outDir": ".flowshot",
  "flows": [
    {
      "name": "Auth Flow",
      "steps": [
        { "screen": "auth", "label": "Login", "path": "/auth" },
        { "screen": "home", "label": "Home", "path": "/" }
      ]
    }
  ],
  "components": [
    { "screen": "header-component", "label": "Header" }
  ]
}
```

| Field | Description |
|-------|-------------|
| `snapshotDir` | Where Playwright stores baseline screenshots |
| `testResultsDir` | Where Playwright writes test results (diffs on failure) |
| `platform` | Snapshot filename suffix, e.g. `chromium-darwin` |
| `views` | Viewport names matching your snapshot filenames |
| `outDir` | Output directory for report and collected diffs |
| `flows` | Array of user flows, each with ordered steps |
| `components` | Shared UI components (header, footer, etc.) |

### Snapshot naming convention

Flowshot expects Playwright snapshots named as:

```
{screen}-{view}-{platform}.png
```

For example: `home-mobile-chromium-darwin.png`, `auth-desktop-chromium-darwin.png`

## Commands

```bash
flowshot              # collect diffs + generate report + open browser
flowshot init         # create flowshot.config.json
flowshot collect      # collect diff images from test-results/
flowshot report       # generate HTML report
flowshot report --open      # generate and open in browser
flowshot report --inline    # embed images as base64 (portable for CI)
flowshot report --collect   # collect diffs before generating
```

## CI Usage

Generate a portable report with embedded images:

```bash
npx flowshot report --collect --inline
```

Upload `.flowshot/report.html` as a CI artifact.

### GitHub Actions example

```yaml
- name: Visual regression
  run: npx playwright test e2e/visual.spec.ts || true

- name: Generate flow report
  run: npx flowshot report --collect --inline

- uses: actions/upload-artifact@v4
  with:
    name: flowshot-report
    path: .flowshot/report.html
```

## License

MIT
