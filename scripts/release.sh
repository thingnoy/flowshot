#!/bin/bash
set -e

# ─── Flowshot Release Script ───
# Usage:
#   ./scripts/release.sh patch    # 0.1.0 → 0.1.1
#   ./scripts/release.sh minor    # 0.1.0 → 0.2.0
#   ./scripts/release.sh major    # 0.1.0 → 1.0.0

BUMP=${1:-patch}
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# ── Preflight checks ──
echo "── Preflight ──"

if [ -n "$(git status --porcelain)" ]; then
  echo "Error: Working directory not clean. Commit or stash changes first."
  exit 1
fi

if ! npm whoami &>/dev/null; then
  echo "Error: Not logged in to npm. Run: npm login"
  exit 1
fi

BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "main" ]; then
  echo "Warning: Not on main branch (on $BRANCH). Continue? [y/N]"
  read -r answer
  if [ "$answer" != "y" ]; then exit 1; fi
fi

# ── Version bump ──
echo ""
echo "── Version bump ($BUMP) ──"
NEW_VERSION=$(npm version $BUMP --no-git-tag-version)
echo "New version: $NEW_VERSION"

# ── Build ──
echo ""
echo "── Build ──"
npm run build

# ── Update screenshots (if demo report exists) ──
DEMO_REPORT=""
# Try to find a report to capture from
for candidate in \
  "../workspace/odds/nuxt-content-a-chieve/.flowshot/report.html" \
  "../nuxt-content-a-chieve/.flowshot/report.html" \
  ".flowshot/report.html"; do
  if [ -f "$candidate" ]; then
    DEMO_REPORT="$candidate"
    break
  fi
done

if [ -n "$DEMO_REPORT" ] && command -v npx &>/dev/null; then
  echo ""
  echo "── Capture screenshots ──"
  node scripts/capture-screenshots.mjs "$DEMO_REPORT" 2>/dev/null && echo "Screenshots updated" || echo "Screenshot capture skipped (no Playwright)"
fi

# ── Commit + Tag ──
echo ""
echo "── Commit & Tag ──"
git add -A
git commit -m "release: $NEW_VERSION"
git tag "$NEW_VERSION"

# ── Push (triggers GitHub Action → npm publish + GitHub Release) ──
echo ""
echo "── Push ──"
git push && git push --tags

echo ""
echo "══════════════════════════════════════════════"
echo "  Released $NEW_VERSION"
echo ""
echo "  GitHub Action will:"
echo "    1. Publish to npm"
echo "    2. Create GitHub Release with changelog"
echo ""
echo "  npm: https://www.npmjs.com/package/flowshot"
echo "  GitHub: https://github.com/thingnoy/flowshot/releases"
echo "══════════════════════════════════════════════"
