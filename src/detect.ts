import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'
import type { Flow, FlowScreen, FlowshotConfig } from './types'

interface DetectedScreen {
  screen: string
  label: string
  path?: string
  view?: string
  isComponent?: boolean
}

/**
 * Auto-detect flows from Playwright test files and snapshot directory.
 *
 * Strategy:
 * 1. Scan snapshot directory for existing screenshot files
 * 2. Parse test files for page.goto() + toHaveScreenshot() patterns
 * 3. Group by test.describe blocks into flows
 * 4. Infer flows from navigation order within each test
 */
export function detectFlows(cwd: string, config: Partial<FlowshotConfig>): {
  flows: Flow[]
  components: FlowScreen[]
  screens: DetectedScreen[]
} {
  const snapshotDir = join(cwd, config.snapshotDir || 'e2e/visual.spec.ts-snapshots')
  const platform = config.platform || 'chromium-darwin'
  const views = config.views || ['mobile', 'desktop']

  // ─── Step 1: Discover screens from snapshot files ───
  const screens = discoverScreensFromSnapshots(snapshotDir, platform, views)

  // ─── Step 2: Parse test files for navigation patterns ───
  const testDir = join(cwd, 'e2e')
  const testPatterns = existsSync(testDir) ? parseTestFiles(testDir) : []

  // ─── Step 3: Build flows ───
  const { flows, components } = buildFlows(screens, testPatterns, views)

  return { flows, components, screens }
}

/**
 * Scan snapshot directory for screenshot files and extract screen names.
 * Pattern: {screen}-{view}-{platform}.png
 */
function discoverScreensFromSnapshots(
  snapshotDir: string,
  platform: string,
  views: string[]
): DetectedScreen[] {
  if (!existsSync(snapshotDir)) return []

  const files = readdirSync(snapshotDir).filter(f => f.endsWith('.png'))
  const screens: DetectedScreen[] = []
  const seen = new Set<string>()

  for (const file of files) {
    const name = basename(file, '.png')

    // Try to match {screen}-{view}-{platform}
    for (const view of views) {
      const suffix = `-${view}-${platform}`
      if (name.endsWith(suffix)) {
        const screen = name.slice(0, -suffix.length)
        if (!seen.has(screen)) {
          seen.add(screen)
          screens.push({
            screen,
            label: screenToLabel(screen),
            view,
          })
        }
        break
      }
    }

    // Check for component screenshots: {screen}-{platform} (no view)
    const compSuffix = `-${platform}`
    if (name.endsWith(compSuffix)) {
      const screen = name.slice(0, -compSuffix.length)
      // Only if not already matched as a view screenshot
      if (!seen.has(screen) && !views.some(v => name.includes(`-${v}-`))) {
        seen.add(screen)
        screens.push({
          screen,
          label: screenToLabel(screen),
          isComponent: true,
        })
      }
    }
  }

  return screens
}

interface TestPattern {
  describe: string
  tests: {
    name: string
    gotos: string[]
    screenshots: string[]
  }[]
}

/**
 * Parse Playwright test files to extract navigation patterns.
 */
function parseTestFiles(testDir: string): TestPattern[] {
  const patterns: TestPattern[] = []
  const files = readdirSync(testDir).filter(f => f.endsWith('.spec.ts') || f.endsWith('.spec.js'))

  for (const file of files) {
    const content = readFileSync(join(testDir, file), 'utf-8')
    const describeBlocks = extractDescribeBlocks(content)

    for (const block of describeBlocks) {
      const tests = extractTests(block.body)
      if (tests.length > 0) {
        patterns.push({
          describe: block.name,
          tests,
        })
      }
    }
  }

  return patterns
}

function extractDescribeBlocks(content: string): { name: string; body: string }[] {
  const blocks: { name: string; body: string }[] = []
  const regex = /test\.describe\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(?:\(\s*\)\s*=>|function\s*\(\s*\))\s*\{/g
  let match

  while ((match = regex.exec(content)) !== null) {
    const name = match[1]
    const startIdx = match.index + match[0].length
    const body = extractBalancedBlock(content, startIdx)
    blocks.push({ name, body })
  }

  // If no describe blocks, treat whole file as one block
  if (blocks.length === 0 && content.includes('test(')) {
    blocks.push({ name: 'Default', body: content })
  }

  return blocks
}

function extractTests(content: string): { name: string; gotos: string[]; screenshots: string[] }[] {
  const tests: { name: string; gotos: string[]; screenshots: string[] }[] = []

  // Match test('name', ...) blocks
  const testRegex = /test\s*\(\s*['"`]([^'"`]+)['"`]/g
  let match

  while ((match = testRegex.exec(content)) !== null) {
    const name = match[1]
    // Get the test body (rough — from match to next test or end)
    const startIdx = match.index
    const nextTest = content.indexOf('test(', startIdx + match[0].length)
    const body = nextTest > -1
      ? content.slice(startIdx, nextTest)
      : content.slice(startIdx)

    const gotos = extractGotos(body)
    const screenshots = extractScreenshots(body)

    if (gotos.length > 0 || screenshots.length > 0) {
      tests.push({ name, gotos, screenshots })
    }
  }

  return tests
}

function extractGotos(content: string): string[] {
  const gotos: string[] = []
  const regex = /page\.goto\s*\(\s*['"`]([^'"`]+)['"`]/g
  let match
  while ((match = regex.exec(content)) !== null) {
    gotos.push(match[1])
  }
  return gotos
}

function extractScreenshots(content: string): string[] {
  const screenshots: string[] = []
  const regex = /toHaveScreenshot\s*\(\s*['"`]([^'"`]+)\.png['"`]/g
  let match
  while ((match = regex.exec(content)) !== null) {
    screenshots.push(match[1])
  }
  return screenshots
}

function extractBalancedBlock(content: string, startIdx: number): string {
  let depth = 1
  let i = startIdx
  while (i < content.length && depth > 0) {
    if (content[i] === '{') depth++
    else if (content[i] === '}') depth--
    i++
  }
  return content.slice(startIdx, i - 1)
}

/**
 * Build flows from discovered screens and test patterns.
 */
function buildFlows(
  screens: DetectedScreen[],
  testPatterns: TestPattern[],
  views: string[]
): { flows: Flow[]; components: FlowScreen[] } {
  const components: FlowScreen[] = []
  const pageScreens = screens.filter(s => !s.isComponent)
  const compScreens = screens.filter(s => s.isComponent)

  // Components
  for (const s of compScreens) {
    components.push({ screen: s.screen, label: s.label })
  }

  // Try to build flows from test patterns (goto sequences)
  const flows: Flow[] = []
  const usedScreens = new Set<string>()

  // From test patterns: group gotos that have matching screenshots
  for (const pattern of testPatterns) {
    for (const test of pattern.tests) {
      if (test.gotos.length >= 2) {
        // Multi-page test = a flow
        const steps: FlowScreen[] = []
        for (const goto of test.gotos) {
          const screen = findScreenForPath(pageScreens, goto)
          if (screen) {
            steps.push({ screen: screen.screen, label: screen.label, path: goto })
            usedScreens.add(screen.screen)
          }
        }
        if (steps.length >= 2) {
          flows.push({
            name: test.name.length > 50 ? test.name.slice(0, 50) + '...' : test.name,
            steps,
          })
        }
      }
    }
  }

  // If no multi-page flows found, create flows by grouping screens by section
  if (flows.length === 0) {
    const groups = groupScreensBySection(pageScreens)
    for (const [section, sectionScreens] of Object.entries(groups)) {
      const steps: FlowScreen[] = sectionScreens.map(s => ({
        screen: s.screen,
        label: s.label,
        path: s.path,
      }))
      if (steps.length > 0) {
        flows.push({ name: screenToLabel(section), steps })
        sectionScreens.forEach(s => usedScreens.add(s.screen))
      }
    }
  }

  // Add remaining screens as individual flows
  const remaining = pageScreens.filter(s => !usedScreens.has(s.screen))
  if (remaining.length > 0) {
    const steps = remaining.map(s => ({
      screen: s.screen,
      label: s.label,
      path: s.path,
    }))
    flows.push({ name: 'Other Pages', steps })
  }

  return { flows, components }
}

function findScreenForPath(screens: DetectedScreen[], path: string): DetectedScreen | undefined {
  // Try exact path match
  const cleaned = path.replace(/^\//, '').replace(/\//g, '-') || 'home'
  return screens.find(s =>
    s.screen === cleaned ||
    s.screen === `${cleaned}-list` ||
    s.screen.includes(cleaned)
  )
}

function groupScreensBySection(screens: DetectedScreen[]): Record<string, DetectedScreen[]> {
  const groups: Record<string, DetectedScreen[]> = {}

  for (const screen of screens) {
    // Group by first segment: "heal-your-heart-list" → "heal-your-heart"
    // "home" → "home", "auth" → "auth"
    const parts = screen.screen.split('-')
    let section: string

    // Common content sections
    if (screen.screen.startsWith('heal-your-heart')) section = 'heal-your-heart'
    else if (screen.screen.startsWith('know-your-self')) section = 'know-your-self'
    else if (screen.screen.startsWith('career-content')) section = 'career-content'
    else if (screen.screen.startsWith('activity')) section = 'activity'
    else section = 'main'

    if (!groups[section]) groups[section] = []
    groups[section].push(screen)
  }

  return groups
}

function screenToLabel(screen: string): string {
  return screen
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}
