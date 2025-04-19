import type { GraphSpec, GraphDatasetSpec, OutputVarId, Series, StringKey } from '@core'

/** View model for a graph. */
export interface GraphViewModel {
  /** The spec that describes the graph datasets and visuals. */
  spec: GraphSpec

  /**
   * Optional callback to customize graph line width.  If defined,
   * this will be called after layout events (e.g. after the browser
   * window is resized.)
   *
   * @return The graph line width in pixels.
   */
  getLineWidth?(): number

  /**
   * Optional callback to customize graph scale label font size.
   * If defined, this will be called after layout events (e.g. after
   * the browser window is resized.)
   *
   * @return The graph scale label font size in pixels.
   */
  getScaleLabelFontSize?(): number

  /**
   * Optional callback to customize graph axis label font size.
   * If defined, this will be called after layout events (e.g. after
   * the browser window is resized.)
   *
   * @return The graph axis label font size in pixels.
   */
  getAxisLabelFontSize?(): number

  /**
   * Optional callback to filter the datasets that are displayed in the graph.
   * If not defined, all datasets from the graph spec will be displayed.
   *
   * @return The subset of datasets to display.
   */
  getDatasets?(): GraphDatasetSpec[]

  /**
   * Return the series data for the given model output variable.
   *
   * @param varId The output variable ID associated with the data.
   * @param sourceName The external data source name (e.g. "Ref"), or
   * undefined to use the latest model output data.
   */
  getSeriesForVar(varId: OutputVarId, sourceName?: string): Series | undefined

  /**
   * Return the translated string for the given key.
   *
   * @param key The string key.
   * @param values The optional map of values to substitute into the template string.
   */
  getStringForKey(key: StringKey, values?: { [key: string]: string }): string

  /**
   * Return a formatted string for the given y-axis tick value.
   *
   * @param value The number value.
   */
  formatYAxisTickValue(value: number): string
}
