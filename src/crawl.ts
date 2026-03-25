import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Flow, FlowScreen } from './types'

interface CrawlOptions {
  baseUrl: string
  outDir: string
  maxPages?: number
  maxDepth?: number
  viewport?: { width: number; height: number }
  waitMs?: number
}

interface CrawledPage {
  url: string
  path: string
  title: string
  screenshot: string
  links: string[]
  depth: number
}

/**
 * Crawl an app using Playwright, discover pages by clicking links,
 * take screenshots, and generate flows automatically.
 *
 * Requires @playwright/test as a peer dependency.
 */
export async function crawlApp(options: CrawlOptions): Promise<{
  pages: CrawledPage[]
  flows: Flow[]
  components: FlowScreen[]
}> {
  const {
    baseUrl,
    outDir,
    maxPages = 20,
    maxDepth = 3,
    viewport = { width: 375, height: 812 },
    waitMs = 2000,
  } = options

  // Dynamic import — Playwright is a peer dependency
  let playwright: any
  try {
    playwright = require('playwright')
  } catch {
    throw new Error(
      'Playwright is required for crawling.\n' +
      'Install it: npm i -D playwright'
    )
  }

  const snapshotDir = join(outDir, 'crawl-snapshots')
  mkdirSync(snapshotDir, { recursive: true })

  const browser = await playwright.chromium.launch()
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()

  const visited = new Set<string>()
  const pages: CrawledPage[] = []
  const queue: { url: string; depth: number; from?: string }[] = [
    { url: baseUrl, depth: 0 }
  ]

  console.log(`\uD83D\uDD77\uFE0F  Crawling ${baseUrl} (max ${maxPages} pages, depth ${maxDepth})`)

  while (queue.length > 0 && pages.length < maxPages) {
    const item = queue.shift()!
    const normalizedPath = normalizePath(item.url, baseUrl)

    if (visited.has(normalizedPath)) continue
    visited.add(normalizedPath)

    try {
      console.log(`  ${pages.length + 1}. ${normalizedPath}`)

      await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 15000 })
      await page.waitForLoadState('networkidle').catch(() => {})
      await page.waitForTimeout(waitMs)

      // Wait for fonts
      await page.waitForFunction(() => document.fonts.ready.then(() => true)).catch(() => {})

      // Get page title
      const title = await page.title().catch(() => normalizedPath)

      // Take screenshot
      const screenshotName = pathToScreenName(normalizedPath)
      const screenshotPath = join(snapshotDir, `${screenshotName}.png`)
      await page.screenshot({ path: screenshotPath })

      // Find all internal links
      const currentOrigin = new URL(baseUrl).origin
      const links = await page.evaluate((origin: string) => {
        const anchors = Array.from(document.querySelectorAll('a[href]'))
        const hrefs: string[] = []

        for (const el of anchors) {
          const a = el as HTMLAnchorElement
          // Get the resolved href (browser resolves relative URLs)
          if (a.href && a.href.startsWith(origin) && !a.href.includes('#')) {
            hrefs.push(a.href)
          }
        }

        return [...new Set(hrefs)]
      }, currentOrigin)

      const internalLinks = links
        .map((l: string) => normalizePath(l, baseUrl))
        .filter((l: string) => !visited.has(l))

      pages.push({
        url: item.url,
        path: normalizedPath,
        title: title || screenshotName,
        screenshot: screenshotPath,
        links: internalLinks,
        depth: item.depth,
      })

      // Queue discovered links
      if (item.depth < maxDepth) {
        for (const link of internalLinks) {
          if (!visited.has(link)) {
            const fullUrl = new URL(link, baseUrl).href
            queue.push({ url: fullUrl, depth: item.depth + 1, from: normalizedPath })
          }
        }
      }
    } catch (err: any) {
      console.log(`  \u26A0 Skip ${normalizedPath}: ${err.message?.slice(0, 60)}`)
    }
  }

  await browser.close()

  // Build flows from navigation graph
  const flows = buildFlowsFromCrawl(pages)

  console.log(`\n\u2705 Crawled ${pages.length} pages, generated ${flows.length} flows`)

  return { pages, flows, components: [] }
}

function normalizePath(url: string, baseUrl: string): string {
  try {
    const u = new URL(url, baseUrl)
    return u.pathname.replace(/\/$/, '') || '/'
  } catch {
    return url
  }
}

function pathToScreenName(path: string): string {
  if (path === '/') return 'home'
  return path
    .replace(/^\//, '')
    .replace(/\//g, '-')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
}

function pathToLabel(path: string): string {
  if (path === '/') return 'Home'
  return path
    .replace(/^\//, '')
    .split('/')
    .map(s => s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '))
    .join(' / ')
}

/**
 * Build flows from crawled pages using link relationships.
 * Each page that links to others creates a flow.
 */
function buildFlowsFromCrawl(pages: CrawledPage[]): Flow[] {
  const flows: Flow[] = []
  const pageMap = new Map(pages.map(p => [p.path, p]))

  // Group pages by top-level section
  const sections: Record<string, CrawledPage[]> = {}
  for (const p of pages) {
    const parts = p.path.split('/').filter(Boolean)
    const section = parts[0] || 'home'
    if (!sections[section]) sections[section] = []
    sections[section].push(p)
  }

  // Create a flow for each section with multiple pages
  for (const [section, sectionPages] of Object.entries(sections)) {
    // Sort by depth (shallow first) then by path
    sectionPages.sort((a, b) => a.depth - b.depth || a.path.localeCompare(b.path))

    const steps: FlowScreen[] = sectionPages.map(p => ({
      screen: pathToScreenName(p.path),
      label: pathToLabel(p.path),
      path: p.path,
    }))

    if (steps.length > 0) {
      flows.push({
        name: pathToLabel('/' + section),
        steps: steps.slice(0, 6), // Max 6 steps per flow
      })
    }
  }

  // Create a "Full Journey" flow: home → each main section
  const mainPages = pages.filter(p => p.depth <= 1).slice(0, 8)
  if (mainPages.length >= 2) {
    flows.unshift({
      name: 'Main Navigation',
      steps: mainPages.map(p => ({
        screen: pathToScreenName(p.path),
        label: pathToLabel(p.path),
        path: p.path,
      })),
    })
  }

  return flows
}
