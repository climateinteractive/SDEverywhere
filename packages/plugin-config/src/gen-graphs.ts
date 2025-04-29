// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { ConfigContext, CsvRow } from './context'
import { optionalNumber, optionalString } from './read-config'
import type {
  GraphAlternateSpec,
  GraphDatasetSpec,
  GraphId,
  GraphKind,
  GraphLegendItemSpec,
  GraphSide,
  GraphSpec,
  LineStyle,
  LineStyleModifier,
  StringKey,
  UnitSystem
} from './spec-types'
import { genStringKey, htmlToUtf8 } from './strings'

/**
 * Convert the `config/graphs.csv` file to config specs that can be used in
 * the core package.
 */
export function generateGraphSpecs(context: ConfigContext): Map<GraphId, GraphSpec> {
  // TODO: Optionally read the graph descriptions from `graphs.md`
  // let descriptions: Map<GraphId, Description>
  // if (useDescriptions) {
  //   descriptions = readGraphDescriptions(context)
  // } else {
  //   descriptions = undefined
  // }

  // Convert `graphs.csv` to graph specs
  const graphsCsv = context.readConfigCsvFile('graphs')
  const graphSpecs: Map<GraphId, GraphSpec> = new Map()
  for (const row of graphsCsv) {
    const spec = graphSpecFromCsv(row, context)
    if (spec) {
      graphSpecs.set(spec.id, spec)
    }
  }

  return graphSpecs
}

function graphSpecFromCsv(g: CsvRow, context: ConfigContext): GraphSpec | undefined {
  const strings = context.strings

  // TODO: For now, all strings use the same "layout" specifier; this could be customized
  // to provide a "maximum length" hint for a group of strings to the translation tool
  const layout = 'default'

  function requiredString(key: string): string {
    const value = g[key]
    if (value === undefined || typeof value !== 'string' || value.trim().length === 0) {
      throw new Error(`Must specify '${key}' for graph ${g.id}`)
    }
    return value
  }

  // Extract required fields
  const graphIdParts = requiredString('id').split(';')
  const graphId = graphIdParts[0]
  const graphIdBaseParts = graphId.split('-')
  const graphBaseId = graphIdBaseParts[0]
  const title = requiredString('graph title')

  // Extract optional fields
  const menuTitle = optionalString(g['menu title'])
  const miniTitle = optionalString(g['mini title'])
  const parentMenu = optionalString(g['parent menu'])
  const description = optionalString(g['description'])
  const kindString = optionalString(g['kind'])

  // Skip rows that have an empty `parent menu` value; this can be used to omit graphs
  // from the product until they've been fully reviewed and approved
  if (!parentMenu) {
    context.log('info', `Skipping graph ${graphId} (${title})`)
    return undefined
  }

  // TODO: Check for a description
  // let desc: Description
  // if (descriptions) {
  //   desc = descriptions.get(graphBaseId)
  //   if (!desc) {
  //     throw new Error(`Graph description for ${graphBaseId} not found in graphs.md`)
  //   }
  // }

  // Helper that creates a string key prefix
  const key = (kind: string) => `graph_${graphBaseId.padStart(3, '0')}_${kind}`

  // Helper that creates a string context
  const strCtxt = (kind: string) => {
    const parent = htmlToUtf8(parentMenu).replace('&amp;', '&')
    const displayTitle = htmlToUtf8(menuTitle || title).replace('&amp;', '&')
    return `Graph ${kind}: ${parent} > ${displayTitle}`
  }

  const titleKey = strings.add(key('title'), title, layout, strCtxt('Title'))
  let menuTitleKey: StringKey
  if (menuTitle) {
    menuTitleKey = strings.add(key('menu_title'), menuTitle, layout, strCtxt('Menu Item'))
  }

  let miniTitleKey: StringKey
  if (miniTitle) {
    miniTitleKey = strings.add(key('mini_title'), miniTitle, layout, strCtxt('Title (for Mini View)'))
  }

  let descriptionKey: StringKey
  if (description) {
    descriptionKey = strings.add(key('description'), description, layout, strCtxt('Description'), 'graph-descriptions')
  }

  // TODO: Validate kind?
  const kind: GraphKind = kindString

  // TODO: Validate graph side?
  const sideString = optionalString(g['side'])
  const side: GraphSide = sideString

  // Determine if this graph is associated with a particular unit system and
  // has an alternate version
  const unitsString = optionalString(g['units'])
  const altIdString = optionalString(g['alternate'])
  let unitSystem: UnitSystem
  let alternates: GraphAlternateSpec[]
  if (unitsString && altIdString) {
    if (unitsString === 'metric') {
      // This graph is metric with a U.S. alternate
      unitSystem = 'metric'
      alternates = [
        {
          id: altIdString,
          unitSystem: 'us'
        }
      ]
    } else if (unitsString === 'us') {
      // This graph is U.S. with a metric alternate
      unitSystem = 'us'
      alternates = [
        {
          id: altIdString,
          unitSystem: 'metric'
        }
      ]
    }
  }

  const modelOptions = context.modelOptions
  const xMin = optionalNumber(g['x axis min']) || modelOptions.graphDefaultMinTime
  const xMax = optionalNumber(g['x axis max']) || modelOptions.graphDefaultMaxTime
  const xAxisLabel = optionalString(g['x axis label'])
  let xAxisLabelKey: StringKey
  if (xAxisLabel) {
    xAxisLabelKey = strings.add(genStringKey('graph_xaxis_label', xAxisLabel), xAxisLabel, layout, 'Graph X-Axis Label')
  }

  const yMin = optionalNumber(g['y axis min']) || 0
  const yMax = optionalNumber(g['y axis max'])
  const ySoftMax = optionalNumber(g['y axis soft max'])
  const yFormat = optionalString(g['y axis format']) || '.0f'
  const yAxisLabel = optionalString(g['y axis label'])
  let yAxisLabelKey: StringKey
  if (yAxisLabel) {
    yAxisLabelKey = strings.add(genStringKey('graph_yaxis_label', yAxisLabel), yAxisLabel, layout, 'Graph Y-Axis Label')
  }

  const datasets: GraphDatasetSpec[] = []
  interface Overrides {
    sourceName?: string
    colorId?: string
  }
  function addDataset(index: number, overrides?: Overrides): void {
    const plotKey = (name: string) => `plot ${index} ${name}`
    const varName = g[plotKey('variable')]
    if (!varName) {
      return
    }

    const varId = context.canonicalVarId(varName)
    const externalSourceName = overrides?.sourceName || optionalString(g[plotKey('source')])
    const datasetLabel = optionalString(g[plotKey('label')])
    let labelKey: StringKey
    if (datasetLabel) {
      labelKey = strings.add(
        genStringKey('graph_dataset_label', datasetLabel),
        datasetLabel,
        layout,
        'Graph Dataset Label'
      )
    }

    const colorId = overrides?.colorId || requiredString(plotKey('color'))
    const hexColor = context.getHexColorForId(colorId)
    if (!hexColor) {
      throw new Error(`Graph ${graphId} references an unknown color ${colorId}`)
    }

    const lineStyleAndModString = optionalString(g[plotKey('style')]) || 'line'
    const lineStyleParts = lineStyleAndModString.split(';')
    const lineStyleString = lineStyleParts[0]
    const lineStyleModifierString = lineStyleParts.length > 1 ? lineStyleParts[1] : undefined

    // TODO: Validate line style and modifiers?
    const lineStyle: LineStyle = lineStyleString
    let lineStyleModifiers: ReadonlyArray<LineStyleModifier>
    if (lineStyleModifierString) {
      // TODO: For now, we assume at most one modifier; should change this to allow > 1
      lineStyleModifiers = [lineStyleModifierString]
    }

    if (externalSourceName === undefined || externalSourceName.startsWith('Scenario') || externalSourceName === 'Ref') {
      // This is a normal model output (i.e., the source name is undefined or starts
      // with "Scenario") or it is a model output for which reference/baseline values
      // will be captured (i.e., the source name is "Ref")
      context.addOutputVariable(varName)
    } else {
      // This is a variable from an external data source (i.e., the data will be
      // included in the static data file)
      context.addStaticVariable(externalSourceName, varName)
    }

    const datasetSpec: GraphDatasetSpec = {
      varId,
      varName,
      externalSourceName,
      labelKey,
      color: hexColor,
      lineStyle,
      lineStyleModifiers
    }
    datasets.push(datasetSpec)
  }

  // Add each dataset configured in graphs.csv
  for (let i = 1; i <= 11; i++) {
    addDataset(i)
  }

  // Only show legend items for datasets that have a label (i.e., ignore
  // some special ones, like the ones used to show dotted reference lines)
  const legendItems: GraphLegendItemSpec[] = datasets
    .filter(dataset => dataset.labelKey?.length > 0)
    .map(dataset => {
      return {
        color: dataset.color,
        labelKey: dataset.labelKey
      }
    })

  const graphSpec: GraphSpec = {
    id: graphId,
    kind,
    titleKey,
    miniTitleKey,
    menuTitleKey,
    descriptionKey,
    side,
    unitSystem,
    alternates,
    xMin,
    xMax,
    xAxisLabelKey,
    yMin,
    yMax,
    ySoftMax,
    yAxisLabelKey,
    yFormat,
    datasets,
    legendItems
  }

  // Add the graph to the menu
  // context.addGraphMenuItem(graphSpec, parentMenu)

  return graphSpec
}
