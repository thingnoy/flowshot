import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync } from 'node:fs'
import { join, basename } from 'node:path'
import type { FlowshotConfig, DiffResult } from './types'

/**
 * Recursively find files matching a pattern in a directory
 */
function findFiles(dir: string, match: (name: string) => boolean): string[] {
  const results: string[] = []
  if (!existsSync(dir)) return results

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      results.push(...findFiles(full, match))
    } else if (match(entry)) {
      results.push(full)
    }
  }
  return results
}

/**
 * Collect diff results from Playwright test-results directory
 * into a flat output directory.
 */
export function collectDiffs(cwd: string, config: FlowshotConfig): {
  copied: number
  diffResults: DiffResult[]
} {
  const testResultsDir = join(cwd, config.testResultsDir)
  const outDir = join(cwd, config.outDir, 'diffs')

  // Clean and recreate output dir
  if (existsSync(outDir)) {
    const files = readdirSync(outDir)
    for (const f of files) {
      const { unlinkSync } = require('node:fs')
      unlinkSync(join(outDir, f))
    }
  }
  mkdirSync(outDir, { recursive: true })

  let copied = 0

  if (existsSync(testResultsDir)) {
    // Find all actual and diff PNGs
    const actualFiles = findFiles(testResultsDir, n => n.endsWith('-actual.png'))
    const diffFiles = findFiles(testResultsDir, n => n.endsWith('-diff.png'))

    for (const file of [...actualFiles, ...diffFiles]) {
      const name = basename(file)
      copyFileSync(file, join(outDir, name))
      copied++
    }
  }

  // Build diff results for each unique screen+view combination
  const diffResults: DiffResult[] = []
  const screens = new Set<string>()
  config.flows.forEach(f => f.steps.forEach(s => screens.add(s.screen)))
  config.components?.forEach(c => screens.add(c.screen))

  for (const screen of screens) {
    for (const view of config.views) {
      const expectedPath = join(
        cwd,
        config.snapshotDir,
        `${screen}-${view}-${config.platform}.png`
      )
      const actualPath = join(outDir, `${screen}-${view}-actual.png`)
      const diffPath = join(outDir, `${screen}-${view}-diff.png`)

      diffResults.push({
        screen,
        view,
        hasActual: existsSync(actualPath),
        hasDiff: existsSync(diffPath),
        expectedPath,
        actualPath: existsSync(actualPath) ? actualPath : undefined,
        diffPath: existsSync(diffPath) ? diffPath : undefined,
      })
    }
  }

  return { copied, diffResults }
}
