// Copyright (c) 2026 Climate Interactive / New Venture Fund

import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join as joinPath } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { CheckConfig, Config, SuiteReport } from '@sdeverywhere/check-core'

import { writeReportExportFiles } from './report-export-files'

describe('writeReportExportFiles', () => {
  let reportDir: string

  beforeEach(() => {
    reportDir = mkdtempSync(joinPath(tmpdir(), 'report-export-'))
  })

  afterEach(() => {
    rmSync(reportDir, { recursive: true, force: true })
  })

  const config: Config = { check: {} as CheckConfig }
  const suiteReport: SuiteReport = {
    checkReport: {
      groups: [{ name: 'Group', tests: [{ name: 'should pass', status: 'passed', scenarios: [] }] }]
    }
  }

  it('should write report.json and report.md to the report directory', async () => {
    await writeReportExportFiles(reportDir, config, suiteReport, 1234)

    const json = JSON.parse(readFileSync(joinPath(reportDir, 'report.json'), 'utf8'))
    expect(json.schemaVersion).toBe(1)
    expect(json.elapsedMillis).toBe(1234)
    expect(json.checks.counts).toEqual({ total: 1, passed: 1, failed: 0, error: 0, skipped: 0 })

    const md = readFileSync(joinPath(reportDir, 'report.md'), 'utf8')
    expect(md).toMatch(/^# Model check report\n/)
    expect(md).toContain(
      [
        '## Checks',
        '',
        '1 test: 1 passed, 0 failed, 0 errors, 0 skipped.',
        '',
        '## Comparisons',
        '',
        'Comparisons were not run.',
        ''
      ].join('\n')
    )
  })

  it('should write report.json in compact form', async () => {
    await writeReportExportFiles(reportDir, config, suiteReport, 0)
    expect(readFileSync(joinPath(reportDir, 'report.json'), 'utf8')).not.toContain('\n')
  })

  it('should create the report directory if it does not exist', async () => {
    const nestedDir = joinPath(reportDir, 'nested', 'check-report')
    await writeReportExportFiles(nestedDir, config, suiteReport, 0)
    expect(JSON.parse(readFileSync(joinPath(nestedDir, 'report.json'), 'utf8')).schemaVersion).toBe(1)
  })
})
