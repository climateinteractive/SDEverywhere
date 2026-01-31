// Copyright (c) 2024 Climate Interactive / New Venture Fund

import type { GeneratedModelInfo } from '../../app-vm.svelte'

/** Style options for a variable line in a graph. */
export type LineStyle = 'solid' | 'dashed' | 'scatter' | 'area' | 'none'

/** Configuration for a variable in a graph. */
export interface GraphVariable {
  /** Unique ID within this graph. */
  id: string
  /** The variable reference ID. */
  varId: string
  /** Display label for the legend. */
  label: string
  /** CSS color (hex or name). */
  color: string
  /** Line style. */
  style: LineStyle
}

/** Configuration for a graph. */
export interface GraphConfig {
  /** Unique graph ID. */
  id: string
  /** Graph title. */
  title: string
  /** Variables to display in this graph. */
  variables: GraphVariable[]
}

/** Configuration for a slider. */
export interface SliderConfig {
  /** Unique slider ID. */
  id: string
  /** The variable reference ID. */
  varId: string
  /** Current value. */
  value: number
  /** Minimum value. */
  min: number
  /** Maximum value. */
  max: number
}

/** Default colors for graph lines. */
const DEFAULT_COLORS = [
  '#4fc3f7', // light blue
  '#81c784', // light green
  '#ffb74d', // orange
  '#f06292', // pink
  '#ba68c8', // purple
  '#4db6ac', // teal
  '#ff8a65', // deep orange
  '#a1887f', // brown
  '#90a4ae', // blue grey
  '#aed581'  // light green 2
]

/**
 * View model for the graphs and sliders editor.
 */
export class GraphsEditorViewModel {
  /** The model info (passed from parent). */
  private modelInfo: GeneratedModelInfo | undefined

  /** All configured graphs. */
  graphs = $state<GraphConfig[]>([])

  /** All configured sliders. */
  sliders = $state<SliderConfig[]>([])

  /** Currently dragged output variable ID. */
  draggedOutputVar = $state<string | undefined>(undefined)

  /** Currently dragged input variable ID. */
  draggedInputVar = $state<string | undefined>(undefined)

  /** Color index for assigning default colors. */
  private colorIndex = 0

  /**
   * Update the model info reference.
   *
   * @param info The new model info.
   */
  setModelInfo(info: GeneratedModelInfo | undefined): void {
    this.modelInfo = info
  }

  /**
   * Get the current model info.
   *
   * @returns The model info or undefined.
   */
  getModelInfo(): GeneratedModelInfo | undefined {
    return this.modelInfo
  }

  /**
   * Get the next default color for a new variable.
   *
   * @returns A CSS color string.
   */
  private getNextColor(): string {
    const color = DEFAULT_COLORS[this.colorIndex % DEFAULT_COLORS.length]
    this.colorIndex++
    return color
  }

  /**
   * Get the display name for a variable ID.
   *
   * @param varId The variable reference ID.
   * @returns The display name.
   */
  getVarDisplayName(varId: string): string {
    // Remove leading underscore and convert underscores to spaces
    let name = varId
    if (name.startsWith('_')) {
      name = name.slice(1)
    }
    return name.replace(/_/g, ' ')
  }

  /**
   * Create a new graph with the given variable.
   *
   * @param varId The variable ID to add.
   * @returns The new graph config.
   */
  createGraph(varId: string): GraphConfig {
    const displayName = this.getVarDisplayName(varId)
    const graph: GraphConfig = {
      id: `graph-${Date.now()}`,
      title: displayName,
      variables: [
        {
          id: `var-${Date.now()}`,
          varId,
          label: displayName,
          color: this.getNextColor(),
          style: 'solid'
        }
      ]
    }
    this.graphs = [...this.graphs, graph]
    return graph
  }

  /**
   * Add a variable to an existing graph.
   *
   * @param graphId The graph ID.
   * @param varId The variable ID to add.
   */
  addVariableToGraph(graphId: string, varId: string): void {
    const graph = this.graphs.find(g => g.id === graphId)
    if (!graph) return

    // Check if variable already exists in this graph
    if (graph.variables.some(v => v.varId === varId)) return

    const displayName = this.getVarDisplayName(varId)
    graph.variables = [
      ...graph.variables,
      {
        id: `var-${Date.now()}`,
        varId,
        label: displayName,
        color: this.getNextColor(),
        style: 'solid'
      }
    ]
    // Trigger reactivity
    this.graphs = [...this.graphs]
  }

  /**
   * Remove a graph.
   *
   * @param graphId The graph ID.
   */
  removeGraph(graphId: string): void {
    this.graphs = this.graphs.filter(g => g.id !== graphId)
  }

  /**
   * Update a graph's title.
   *
   * @param graphId The graph ID.
   * @param title The new title.
   */
  updateGraphTitle(graphId: string, title: string): void {
    const graph = this.graphs.find(g => g.id === graphId)
    if (graph) {
      graph.title = title
      this.graphs = [...this.graphs]
    }
  }

  /**
   * Update a variable in a graph.
   *
   * @param graphId The graph ID.
   * @param varConfigId The variable config ID.
   * @param updates Partial updates to apply.
   */
  updateGraphVariable(
    graphId: string,
    varConfigId: string,
    updates: Partial<Omit<GraphVariable, 'id' | 'varId'>>
  ): void {
    const graph = this.graphs.find(g => g.id === graphId)
    if (!graph) return

    const varConfig = graph.variables.find(v => v.id === varConfigId)
    if (!varConfig) return

    Object.assign(varConfig, updates)
    this.graphs = [...this.graphs]
  }

  /**
   * Remove a variable from a graph.
   *
   * @param graphId The graph ID.
   * @param varConfigId The variable config ID.
   */
  removeVariableFromGraph(graphId: string, varConfigId: string): void {
    const graph = this.graphs.find(g => g.id === graphId)
    if (!graph) return

    graph.variables = graph.variables.filter(v => v.id !== varConfigId)

    // Remove graph if no variables left
    if (graph.variables.length === 0) {
      this.removeGraph(graphId)
    } else {
      this.graphs = [...this.graphs]
    }
  }

  /**
   * Reorder variables in a graph.
   *
   * @param graphId The graph ID.
   * @param fromIndex The source index.
   * @param toIndex The destination index.
   */
  reorderGraphVariables(graphId: string, fromIndex: number, toIndex: number): void {
    const graph = this.graphs.find(g => g.id === graphId)
    if (!graph) return

    const variables = [...graph.variables]
    const [removed] = variables.splice(fromIndex, 1)
    variables.splice(toIndex, 0, removed)
    graph.variables = variables
    this.graphs = [...this.graphs]
  }

  /**
   * Reorder graphs.
   *
   * @param fromIndex The source index.
   * @param toIndex The destination index.
   */
  reorderGraphs(fromIndex: number, toIndex: number): void {
    const graphs = [...this.graphs]
    const [removed] = graphs.splice(fromIndex, 1)
    graphs.splice(toIndex, 0, removed)
    this.graphs = graphs
  }

  /**
   * Create a new slider.
   *
   * @param varId The variable ID.
   * @returns The new slider config.
   */
  createSlider(varId: string): SliderConfig {
    // Check if slider already exists
    if (this.sliders.some(s => s.varId === varId)) {
      return this.sliders.find(s => s.varId === varId)!
    }

    const slider: SliderConfig = {
      id: `slider-${Date.now()}`,
      varId,
      value: 0,
      min: -100,
      max: 100
    }
    this.sliders = [...this.sliders, slider]
    return slider
  }

  /**
   * Update a slider value.
   *
   * @param sliderId The slider ID.
   * @param value The new value.
   */
  updateSliderValue(sliderId: string, value: number): void {
    const slider = this.sliders.find(s => s.id === sliderId)
    if (slider) {
      slider.value = value
      this.sliders = [...this.sliders]
    }
  }

  /**
   * Remove a slider.
   *
   * @param sliderId The slider ID.
   */
  removeSlider(sliderId: string): void {
    this.sliders = this.sliders.filter(s => s.id !== sliderId)
  }
}
