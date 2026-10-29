// Copyright (c) 2026 Climate Interactive / New Venture Fund

import { mkdir, writeFile } from 'node:fs/promises'
import { join as joinPath } from 'node:path'

import type { Config, SuiteReport } from '@sdeverywhere/check-core'
import { exportSuiteReport, formatSuiteExportAsMarkdown } from '@sdeverywhere/check-core'

/**
 * Write machine-readable versions of the suite report (`report.json` and `report.md`)
 * to the given report directory.  These files allow tools (including LLMs) to read
 * the check and comparison results without running the model-check web app.
 *
 * @param reportDir The directory where the files will be written.
 * @param config The configuration that was used to run the suite.
 * @param suiteReport The full suite report.
 * @param elapsedMillis The time in milliseconds that it took to run the suite.
 */
export async function writeReportExportFiles(
  reportDir: string,
  config: Config,
  suiteReport: SuiteReport,
  elapsedMillis: number
): Promise<void> {
  const suiteExport = exportSuiteReport(config, suiteReport, { elapsedMillis })
  await mkdir(reportDir, { recursive: true })
  await writeFile(joinPath(reportDir, 'report.json'), JSON.stringify(suiteExport, null, 2))
  await writeFile(joinPath(reportDir, 'report.md'), formatSuiteExportAsMarkdown(suiteExport))
}
