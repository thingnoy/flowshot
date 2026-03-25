import { Command } from 'commander'
import { existsSync, writeFileSync, readFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { createConfig, loadConfig, configExists } from './config'
import { collectDiffs } from './collect'
import { generateReport } from './report'
import { detectFlows } from './detect'
import type { FlowshotConfig } from './types'

const pkg = { version: '0.1.0' }

const program = new Command()
  .name('flowshot')
  .description(
    'Flow-based visual regression dashboard for Playwright.\n' +
    'Screenshots as user flows with arrows + diff slider.'
  )
  .version(pkg.version)

// ─── init ───
program
  .command('init')
  .description('Create flowshot.config.json with example flows')
  .option('--detect', 'Auto-detect flows from Playwright tests (default)')
  .action((opts) => {
    const cwd = process.cwd()

    if (configExists(cwd)) {
      console.log(`\u26A0  Config already exists: ${join(cwd, 'flowshot.config.json')}`)
      return
    }

    // Try auto-detect first
    const { flows, components, screens } = detectFlows(cwd, {})

    if (screens.length > 0) {
      const config = {
        snapshotDir: 'e2e/visual.spec.ts-snapshots',
        testResultsDir: 'test-results',
        platform: 'chromium-darwin',
        views: ['mobile', 'desktop'],
        outDir: '.flowshot',
        flows,
        components,
      }
      // writeFileSync imported at top
      writeFileSync(
        join(cwd, 'flowshot.config.json'),
        JSON.stringify(config, null, 2) + '\n'
      )
      console.log(`\u2705 Auto-detected ${screens.length} screens, ${flows.length} flows`)
      console.log(`   Written to flowshot.config.json`)
    } else {
      const result = createConfig(cwd)
      console.log(`\u2705 Created ${result} with example flows`)
      console.log('   Edit flowshot.config.json to define your flows')
    }

    console.log('')
    console.log('Next: Run your Playwright visual tests, then: flowshot')
  })

// ─── detect ───
program
  .command('detect')
  .description('Auto-detect flows from Playwright tests and snapshots')
  .option('--write', 'Write detected flows to flowshot.config.json')
  .option('--merge', 'Merge detected flows into existing config')
  .action((opts) => {
    const cwd = process.cwd()
    const partialConfig: Partial<FlowshotConfig> = configExists(cwd) ? loadConfig(cwd) : {}
    const { flows, components, screens } = detectFlows(cwd, partialConfig)

    console.log(`\uD83D\uDD0D Detected ${screens.length} screens, ${flows.length} flows, ${components.length} components`)
    console.log('')

    for (const flow of flows) {
      const steps = flow.steps.map(s => s.label).join(' \u2192 ')
      console.log(`  ${flow.name} (${flow.steps.length} screens)`)
      console.log(`    ${steps}`)
    }

    if (components.length > 0) {
      console.log(`\n  Components: ${components.map(c => c.label).join(', ')}`)
    }

    if (opts.write || opts.merge) {
      const configPath = join(cwd, 'flowshot.config.json')

      let config: any
      if (opts.merge && configExists(cwd)) {
        config = JSON.parse(readFileSync(configPath, 'utf-8'))
        // Add new flows that don't exist yet
        const existingNames = new Set(config.flows.map((f: any) => f.name))
        const newFlows = flows.filter(f => !existingNames.has(f.name))
        config.flows.push(...newFlows)
        if (!config.components) config.components = []
        const existingComps = new Set(config.components.map((c: any) => c.screen))
        const newComps = components.filter(c => !existingComps.has(c.screen))
        config.components.push(...newComps)
        console.log(`\n\u2705 Merged ${newFlows.length} new flows, ${newComps.length} new components`)
      } else {
        config = {
          snapshotDir: partialConfig.snapshotDir || 'e2e/visual.spec.ts-snapshots',
          testResultsDir: partialConfig.testResultsDir || 'test-results',
          platform: partialConfig.platform || 'chromium-darwin',
          views: partialConfig.views || ['mobile', 'desktop'],
          outDir: partialConfig.outDir || '.flowshot',
          flows,
          components,
        }
        console.log(`\n\u2705 Written ${flows.length} flows to flowshot.config.json`)
      }
      writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n')
    } else {
      console.log('\nRun with --write to save, or --merge to add to existing config')
    }
  })

// ─── crawl ───
program
  .command('crawl')
  .description('Crawl app with Playwright — discover pages, take screenshots, generate flows')
  .requiredOption('--url <url>', 'Base URL of the running app (e.g. http://localhost:3000)')
  .option('--max-pages <n>', 'Max pages to visit', '20')
  .option('--max-depth <n>', 'Max link depth to follow', '3')
  .option('--mobile', 'Use mobile viewport (375x812)', false)
  .option('--write', 'Write discovered flows to flowshot.config.json (overwrites)')
  .option('--merge', 'Merge discovered flows into existing config')
  .action(async (opts) => {
    const { crawlApp } = await import('./crawl')
    const cwd = process.cwd()
    const outDir = join(cwd, '.flowshot')

    const viewport = opts.mobile
      ? { width: 375, height: 812 }
      : { width: 1440, height: 900 }

    const { pages, flows } = await crawlApp({
      baseUrl: opts.url,
      outDir,
      maxPages: parseInt(opts.maxPages),
      maxDepth: parseInt(opts.maxDepth),
      viewport,
    })

    console.log('')
    for (const flow of flows) {
      const steps = flow.steps.map(s => s.label).join(' \u2192 ')
      console.log(`  ${flow.name} (${flow.steps.length} screens)`)
      console.log(`    ${steps}`)
    }

    if (opts.write || opts.merge) {
      const configPath = join(cwd, 'flowshot.config.json')

      if (opts.merge && existsSync(configPath)) {
        const existing = JSON.parse(readFileSync(configPath, 'utf-8'))
        const existingNames = new Set(existing.flows.map((f: any) => f.name))
        const newFlows = flows.filter(f => !existingNames.has(f.name))
        existing.flows.push(...newFlows)
        writeFileSync(configPath, JSON.stringify(existing, null, 2) + '\n')
        console.log(`\n\u2705 Merged ${newFlows.length} new flows (${existing.flows.length} total)`)
      } else {
        const config = {
          snapshotDir: '.flowshot/crawl-snapshots',
          testResultsDir: 'test-results',
          platform: 'crawl',
          views: [opts.mobile ? 'mobile' : 'desktop'],
          outDir: '.flowshot',
          flows,
          components: [],
        }
        writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n')
        console.log(`\n\u2705 Written ${flows.length} flows to flowshot.config.json`)
      }
      console.log(`   Screenshots: .flowshot/crawl-snapshots/`)
      console.log(`   Run: flowshot report --open`)
    }
  })

// ─── collect ───
program
  .command('collect')
  .description('Collect diff images from Playwright test-results')
  .action(() => {
    const cwd = process.cwd()
    const config = loadConfig(cwd)
    const { copied, diffResults } = collectDiffs(cwd, config)

    const changed = diffResults.filter(d => d.hasActual).length
    const total = diffResults.length

    if (copied === 0) {
      console.log('\u2705 No visual diffs found — all screenshots match baseline!')
    } else {
      console.log(`\uD83D\uDCE6 Collected ${copied} diff files`)
      console.log(`   ${changed}/${total} screen+view combinations have changes`)
    }
  })

// ─── report ───
program
  .command('report')
  .description('Generate HTML flow dashboard report')
  .option('--inline', 'Embed images as base64 (portable, larger file)')
  .option('--open', 'Open report in browser after generating')
  .option('--collect', 'Collect diffs before generating report')
  .action(async (opts) => {
    const cwd = process.cwd()
    const config = loadConfig(cwd)

    if (opts.collect) {
      const { copied } = collectDiffs(cwd, config)
      if (copied > 0) {
        console.log(`\uD83D\uDCE6 Collected ${copied} diff files`)
      }
    }

    const reportPath = generateReport(cwd, config, { inline: opts.inline })
    console.log(`\u2705 Report generated: ${reportPath}`)

    if (opts.open) {
      const { exec } = require('node:child_process')
      const platform = process.platform
      const cmd = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open'
      exec(`${cmd} "${reportPath}"`)
    }
  })

// ─── default command (report --collect --open) ───
program
  .command('go', { isDefault: true })
  .description('Collect diffs + generate report + open (default)')
  .option('--inline', 'Embed images as base64')
  .action(async (opts) => {
    const cwd = process.cwd()

    if (!existsSync(resolve(cwd, 'flowshot.config.json'))) {
      console.log('\u26A0  No flowshot.config.json found.')
      console.log('   Run: flowshot init')
      process.exit(1)
    }

    const config = loadConfig(cwd)
    const { copied, diffResults } = collectDiffs(cwd, config)
    const changed = diffResults.filter(d => d.hasActual).length

    if (copied > 0) {
      console.log(`\uD83D\uDCE6 ${changed} screens with visual changes`)
    } else {
      console.log('\u2705 No visual diffs')
    }

    const reportPath = generateReport(cwd, config, { inline: opts.inline })
    console.log(`\uD83D\uDCC4 ${reportPath}`)

    const { exec } = require('node:child_process')
    const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open'
    exec(`${cmd} "${reportPath}"`)
  })

program.parse()
