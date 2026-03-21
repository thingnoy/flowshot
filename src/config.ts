import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { FlowshotConfig } from './types'

const CONFIG_FILE = 'flowshot.config.json'

const DEFAULT_CONFIG: FlowshotConfig = {
  snapshotDir: 'e2e/visual.spec.ts-snapshots',
  testResultsDir: 'test-results',
  platform: 'chromium-darwin',
  views: ['mobile', 'desktop'],
  outDir: '.flowshot',
  flows: [
    {
      name: 'Example Flow',
      steps: [
        { screen: 'home', label: 'Home', path: '/' },
        { screen: 'login', label: 'Login', path: '/login' },
        { screen: 'dashboard', label: 'Dashboard', path: '/dashboard' },
      ],
    },
  ],
  components: [
    { screen: 'header-component', label: 'Header' },
    { screen: 'footer-component', label: 'Footer' },
  ],
}

export function configPath(cwd: string): string {
  return join(cwd, CONFIG_FILE)
}

export function configExists(cwd: string): boolean {
  return existsSync(configPath(cwd))
}

export function loadConfig(cwd: string): FlowshotConfig {
  const p = configPath(cwd)
  if (!existsSync(p)) {
    throw new Error(
      `Config not found: ${p}\nRun "flowshot init" to create one.`
    )
  }
  const raw = JSON.parse(readFileSync(p, 'utf-8'))
  return { ...DEFAULT_CONFIG, ...raw }
}

export function createConfig(cwd: string): string {
  const p = configPath(cwd)
  if (existsSync(p)) {
    return `Config already exists: ${p}`
  }
  writeFileSync(p, JSON.stringify(DEFAULT_CONFIG, null, 2) + '\n')
  return p
}
