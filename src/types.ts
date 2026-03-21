export interface FlowScreen {
  screen: string
  label: string
  path?: string
}

export interface Flow {
  name: string
  steps: FlowScreen[]
}

export interface FlowshotConfig {
  /** Directory containing Playwright snapshot baselines */
  snapshotDir: string
  /** Directory where Playwright writes test results (diffs) */
  testResultsDir: string
  /** Platform suffix, e.g. "chromium-darwin" */
  platform: string
  /** Viewport names to support */
  views: string[]
  /** User flows — screens connected in order */
  flows: Flow[]
  /** Shared components (header, footer, etc.) */
  components?: FlowScreen[]
  /** Output directory for report and collected diffs */
  outDir: string
}

export interface DiffResult {
  screen: string
  view: string
  hasActual: boolean
  hasDiff: boolean
  expectedPath: string
  actualPath?: string
  diffPath?: string
}
