import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'

const BASE_URL = process.env.E2E_BASE_URL || 'http://127.0.0.1:3100'

const profiles = [
  {
    id: 'wifi',
    label: 'Wi-Fi',
    latency: 20,
    downloadBps: Math.floor((10 * 1024 * 1024) / 8),
    uploadBps: Math.floor((5 * 1024 * 1024) / 8),
    connectionType: 'wifi'
  },
  {
    id: '4g',
    label: '4G',
    latency: 80,
    downloadBps: Math.floor((4 * 1024 * 1024) / 8),
    uploadBps: Math.floor((1.5 * 1024 * 1024) / 8),
    connectionType: 'cellular4g'
  },
  {
    id: '3g',
    label: '3G',
    latency: 300,
    downloadBps: Math.floor((1.6 * 1024 * 1024) / 8),
    uploadBps: Math.floor((0.75 * 1024 * 1024) / 8),
    connectionType: 'cellular3g'
  }
]

const paths = ['/', '/ofertas-laborales', '/admin/signin']

async function captureMetricForPath(browser, profile, path) {
  const context = await browser.newContext()
  const page = await context.newPage()
  const client = await context.newCDPSession(page)
  await client.send('Network.enable')
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: profile.latency,
    downloadThroughput: profile.downloadBps,
    uploadThroughput: profile.uploadBps,
    connectionType: profile.connectionType
  })

  await page.addInitScript(() => {
    window.__perfCapture = { lcp: 0, cls: 0 }

    try {
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries()
        const last = entries[entries.length - 1]
        if (!last) return
        window.__perfCapture.lcp = last.startTime
      })
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })
    } catch {}

    try {
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!entry.hadRecentInput) {
            window.__perfCapture.cls += entry.value || 0
          }
        }
      })
      clsObserver.observe({ type: 'layout-shift', buffered: true })
    } catch {}
  })

  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle', timeout: 90_000 })
  await page.waitForTimeout(1500)

  const metric = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0]
    const paintEntries = performance.getEntriesByType('paint')
    const fcp = paintEntries.find((entry) => entry.name === 'first-contentful-paint')?.startTime ?? null

    return {
      ttfbMs: nav ? nav.responseStart - nav.requestStart : 0,
      dclMs: nav ? nav.domContentLoadedEventEnd - nav.startTime : 0,
      loadMs: nav ? nav.loadEventEnd - nav.startTime : 0,
      fcpMs: fcp,
      lcpMs: window.__perfCapture?.lcp ?? null,
      cls: window.__perfCapture?.cls ?? 0
    }
  })

  await context.close()

  return {
    profile: profile.label,
    path,
    ...metric
  }
}

function toFixed(value, digits = 0) {
  if (value === null || Number.isNaN(value)) return 'n/a'
  return value.toFixed(digits)
}

function buildMarkdownReport(metrics) {
  const lines = []
  lines.push('# Performance Matrix')
  lines.push('')
  lines.push(`Base URL: \`${BASE_URL}\``)
  lines.push('')
  lines.push('| Profile | Path | TTFB (ms) | FCP (ms) | LCP (ms) | DCL (ms) | Load (ms) | CLS |')
  lines.push('|---|---|---:|---:|---:|---:|---:|---:|')

  for (const metric of metrics) {
    lines.push(
      `| ${metric.profile} | \`${metric.path}\` | ${toFixed(metric.ttfbMs)} | ${toFixed(metric.fcpMs)} | ${toFixed(metric.lcpMs)} | ${toFixed(metric.dclMs)} | ${toFixed(metric.loadMs)} | ${toFixed(metric.cls, 3)} |`
    )
  }

  return `${lines.join('\n')}\n`
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const metrics = []

  try {
    for (const profile of profiles) {
      for (const path of paths) {
        const metric = await captureMetricForPath(browser, profile, path)
        metrics.push(metric)
      }
    }
  } finally {
    await browser.close()
  }

  await mkdir('reports', { recursive: true })
  await mkdir('docs', { recursive: true })

  await writeFile('reports/perf-matrix.json', JSON.stringify(metrics, null, 2), 'utf-8')
  await writeFile('docs/PERFORMANCE-MATRIX.md', buildMarkdownReport(metrics), 'utf-8')

  console.log('Performance matrix generated:')
  console.log('- reports/perf-matrix.json')
  console.log('- docs/PERFORMANCE-MATRIX.md')
}

main().catch((error) => {
  console.error('Failed to run performance matrix', error)
  process.exit(1)
})
