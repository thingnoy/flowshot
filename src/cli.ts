import { Command } from 'commander'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createConfig, loadConfig } from './config'
import { collectDiffs } from './collect'
import { generateReport } from './report'

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
  .action(() => {
    const cwd = process.cwd()
    const result = createConfig(cwd)
    if (result.startsWith('Config already')) {
      console.log(`\u26A0  ${result}`)
    } else {
      console.log(`\u2705 Created ${result}`)
      console.log('')
      console.log('Next steps:')
      console.log('  1. Edit flowshot.config.json — define your flows')
      console.log('  2. Run your Playwright visual tests')
      console.log('  3. Run: flowshot report')
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
