import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import type { FlowshotConfig } from './types'
import { generateTemplate } from './template'

export interface ReportOptions {
  inline?: boolean
}

function toBase64DataUrl(filePath: string): string {
  if (!existsSync(filePath)) return ''
  const buf = readFileSync(filePath)
  return `data:image/png;base64,${buf.toString('base64')}`
}

/**
 * Build the image source map for the template.
 * When inline=true, images are embedded as base64.
 * Otherwise, relative paths from the report to the images.
 */
function buildImageMap(
  cwd: string,
  config: FlowshotConfig,
  reportDir: string,
  inline: boolean
): Record<string, string> {
  const map: Record<string, string> = {}
  const screens = new Set<string>()
  config.flows.forEach(f => f.steps.forEach(s => screens.add(s.screen)))
  config.components?.forEach(c => screens.add(c.screen))

  for (const screen of screens) {
    for (const view of config.views) {
      // Expected (baseline)
      const expectedFile = `${screen}-${view}-${config.platform}.png`
      const expectedPath = join(cwd, config.snapshotDir, expectedFile)
      const expectedKey = `expected:${screen}:${view}`

      if (inline) {
        map[expectedKey] = toBase64DataUrl(expectedPath)
      } else {
        map[expectedKey] = existsSync(expectedPath)
          ? relative(reportDir, expectedPath)
          : ''
      }

      // Actual (from collected diffs)
      const actualFile = `${screen}-${view}-actual.png`
      const actualPath = join(cwd, config.outDir, 'diffs', actualFile)
      const actualKey = `actual:${screen}:${view}`

      if (inline) {
        map[actualKey] = toBase64DataUrl(actualPath)
      } else {
        map[actualKey] = existsSync(actualPath)
          ? relative(reportDir, actualPath)
          : ''
      }

      // Diff overlay
      const diffFile = `${screen}-${view}-diff.png`
      const diffPath = join(cwd, config.outDir, 'diffs', diffFile)
      const diffKey = `diff:${screen}:${view}`

      if (inline) {
        map[diffKey] = toBase64DataUrl(diffPath)
      } else {
        map[diffKey] = existsSync(diffPath)
          ? relative(reportDir, diffPath)
          : ''
      }
    }

    // Components don't have views — they use platform suffix directly
    if (config.components?.find(c => c.screen === screen)) {
      const compFile = `${screen}-${config.platform}.png`
      const compPath = join(cwd, config.snapshotDir, compFile)
      const compKey = `expected:${screen}:component`

      if (inline) {
        map[compKey] = toBase64DataUrl(compPath)
      } else {
        map[compKey] = existsSync(compPath)
          ? relative(reportDir, compPath)
          : ''
      }
    }
  }

  return map
}

export function generateReport(
  cwd: string,
  config: FlowshotConfig,
  options: ReportOptions = {}
): string {
  const reportDir = join(cwd, config.outDir)
  mkdirSync(reportDir, { recursive: true })

  const imageMap = buildImageMap(cwd, config, reportDir, !!options.inline)
  const html = generateTemplate(config, imageMap)

  const reportPath = join(reportDir, 'report.html')
  writeFileSync(reportPath, html)
  return reportPath
}
