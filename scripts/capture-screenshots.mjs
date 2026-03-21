import { chromium } from 'playwright'
import { resolve } from 'node:path'
import { existsSync } from 'node:fs'

const reportPath = process.argv[2]
if (!reportPath) {
  console.error('Usage: node capture-screenshots.mjs <path-to-report.html>')
  process.exit(1)
}

const absPath = resolve(reportPath)
if (!existsSync(absPath)) {
  console.error(`File not found: ${absPath}`)
  process.exit(1)
}

const outDir = resolve(import.meta.dirname, '..', 'assets')
const url = `file://${absPath}`

const browser = await chromium.launch()

// Dark theme — flow view
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(url)
await page.waitForTimeout(500)
await page.screenshot({ path: resolve(outDir, 'dashboard-dark.png') })
console.log('Captured: dashboard-dark.png')

// Light theme
await page.click('#theme-toggle')
await page.waitForTimeout(300)
await page.screenshot({ path: resolve(outDir, 'dashboard-light.png') })
console.log('Captured: dashboard-light.png')

// Back to dark, single flow filter
await page.click('#theme-toggle')
await page.waitForTimeout(200)
// Click the 3rd sidebar link (Heal Your Heart — has 3 steps)
const flowLinks = page.locator('.flow-link')
const count = await flowLinks.count()
if (count >= 4) {
  await flowLinks.nth(3).click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: resolve(outDir, 'flow-detail.png') })
  console.log('Captured: flow-detail.png')
}

// Diff mode
await flowLinks.nth(0).click() // back to all
await page.waitForTimeout(200)
await page.click('#diff-toggle')
await page.waitForTimeout(300)
await page.screenshot({ path: resolve(outDir, 'diff-mode.png') })
console.log('Captured: diff-mode.png')

await browser.close()
console.log('Done!')
