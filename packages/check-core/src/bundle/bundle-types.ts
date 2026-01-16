// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { DataSource } from '../_shared/data-source'
import type { InputSetting, ScenarioSpec } from '../_shared/scenario-spec-types'
import type { DatasetKey, DatasetMap, VarId } from '../_shared/types'

import type { ImplVar, InputVar, OutputVar } from './var-types'

/** The human-readable name for a group of inputs. */
export type InputGroupName = string

/** The alias name for an input. */
export type InputAliasName = string

/** The name for a custom input setting group. */
export type InputSettingGroupId = string

/** The human-readable name for a group of datasets. */
export type DatasetGroupName = string

/**
 * Describes a group of implementation variables.
 */
export interface ImplVarGroup {
  /** The group title. */
  title: string
  /**
   * The function name in the generated model that is associated with
   * this group.  This can be used when displaying the group to change
   * the appearance of the items in the section.
   */
  fn?: string
  /**
   * The keys of the variables in this group (corresponding to the
   * `implVars` map keys).  It is recommended to provide these in the
   * order that the variables are evaluated in the generated model.
   */
  datasetKeys: DatasetKey[]
}

/**
 * Includes the properties needed to display a legend item in the UI.
 */
export interface LegendItem {
  /** The item text. */
  label: string
  /** The color of the item (in CSS/hex format). */
  color: string
}

/**
 * Includes the properties needed to display a link item in the UI.
 */
export interface LinkItem {
  /** Whether content is a URL or text to be copied to the clipboard. */
  kind: 'url' | 'copy'
  /** The link text that appears in the UI. */
  text: string
  /** The link content (a URL or text). */
  content: string
}

/** The identifier for a bundle-specific graph. */
export type BundleGraphId = string

/**
 * Describes a dataset in a bundle-specific graph.
 */
export interface BundleGraphDatasetSpec {
  /** The dataset key. */
  datasetKey: DatasetKey
  /** The dataset or variable name. */
  varName: string
  /** The source name. */
  sourceName?: string
  /** The label string (as it appears in the graph legend). */
  label?: string
  /** The color of the plot (in CSS/hex format). */
  color: string
}

/**
 * Describes a bundle-specific graph.
 */
export interface BundleGraphSpec {
  /** The graph identifier. */
  id: BundleGraphId
  /** The graph title. */
  title: string
  /** The legend items for the graph. */
  legendItems: LegendItem[]
  /** The datasets displayed in this graph. */
  datasets: BundleGraphDatasetSpec[]
  /** Metadata for the graph that can be used to diff to another graph. */
  metadata: Map<string, string>
}

/**
 * Options for configuring a bundle-specific graph view.
 */
export interface BundleGraphViewOptions {
  /** Whether graph updates will be animated (default is false). */
  animated?: boolean
  /** A hint that indicates the context in which the graph will be displayed. */
  style?: 'thumbnail' | undefined
}

/**
 * Allows for displaying a bundle-specific graph.
 */
export interface BundleGraphView {
  /**
   * Update the data that is displayed in the graph.
   *
   * @hidden This method is optional; it is not currently used by the report UI, but may be useful
   * for other tools that want to display bundle-specific graphs.
   *
   * @param datasetMap The map of datasets that contain the data to be displayed in the graph.
   */
  updateData?(datasetMap: DatasetMap): void

  /** Destroy the underlying graph view and any associated resources. */
  destroy(): void
}

/**
 * Wrapper around data that can be used to initialize a graph view.
 */
export interface BundleGraphData {
  /**
   * Return a graph view that can be attached to the given parent element.  The returned
   * `BundleGraphView` instance will already be configured to display the data that was
   * fetched from the model for the associated scenario.
   *
   * @param parent The parent element to which the graph view will be attached.
   * @returns A `BundleGraphView` instance.
   */
  createGraphView(parent: HTMLElement): BundleGraphView
}

/**
 * Describes the model that is contained in this bundle.
 */
export interface ModelSpec {
  /** The size of the model binary, in bytes. */
  modelSizeInBytes: number
  /** The size of the static data, in bytes. */
  dataSizeInBytes: number
  /** The map of all input variables in this version of the model. */
  inputVars: Map<VarId, InputVar>
  /** The map of all output (and static data) variables in this version of the model. */
  outputVars: Map<DatasetKey, OutputVar>
  /** The map of all variables (both internal and exported) in this version of the model. */
  implVars: Map<DatasetKey, ImplVar>
  /** The groupings of internal/implementation variables in this version of the model. */
  implVarGroups?: ImplVarGroup[]
  /** The custom input variable aliases defined for this model. */
  inputAliases?: Map<InputAliasName, VarId>
  /** The custom input variable groups defined for this model. */
  inputGroups?: Map<InputGroupName, InputVar[]>
  /** The custom input setting groups defined for this model. */
  inputSettingGroups?: Map<InputSettingGroupId, InputSetting[]>
  /** The custom dataset (output variable) groups defined for this model. */
  datasetGroups?: Map<DatasetGroupName, DatasetKey[]>
  /** The start time (year) for the model. */
  startTime?: number
  /** The end time (year) for the model. */
  endTime?: number
  /** The specs for the bundled graphs. */
  graphSpecs?: BundleGraphSpec[]
}

/**
 * An interface that allows for running the bundled model under different input scenarios
 * and capturing the resulting output data.
 */
export interface BundleModel extends DataSource {
  /** The spec for the bundled model. */
  modelSpec: ModelSpec

  /**
   * Load the data used to display the graph by running the model with inputs
   * configured for the given scenario.
   *
   * The returned `BundleGraphData` instance will contain the data associated with the
   * given graph.  Calling the `createGraphView` method on the `BundleGraphData` instance
   * will create a `BundleGraphView` that is already configured to display the data
   * associated with the graph.
   *
   * This method is optional; if not implemented, custom graphs will not be displayed in
   * the report UI.
   *
   * @param scenarioSpec The scenario spec that defines the inputs for the model run.
   * @param graphId The identifier of the graph for which data will be loaded.
   * @returns The graph data.
   */
  getGraphDataForScenario?(scenarioSpec: ScenarioSpec, graphId: BundleGraphId): Promise<BundleGraphData>

  /**
   * Return the links to be displayed for the graph in the given scenario.
   *
   * This method is optional; if not implemented, no graph links will be displayed in the report UI.
   *
   * @param scenarioSpec The scenario spec that defines the inputs for the model run.
   * @param graphId The identifier of the graph for which links will be prepared.
   * @returns An array of `LinkItem` instances.
   */
  getGraphLinksForScenario?(scenarioSpec: ScenarioSpec, graphId: BundleGraphId): LinkItem[]

  /**
   * Return a graph view that is attached to the given element and that is prepared to display data
   * for the given graph.
   *
   * Unlike `getGraphDataForScenario`, this method only creates the graph view.  The data for the
   * graph must be provided separately by calling the `updateData` method on the `BundleGraphView`
   * instance.
   *
   * @hidden This method is optional; it is not currently used by the report UI, but may be useful
   * for other tools that want to display bundle-specific graphs.
   *
   * @param parent The parent element to which the graph view will be attached.
   * @param graphId The identifier of the graph for which the graph view will be prepared.
   * @param options Optional configuration for the graph view.
   * @returns A `BundleGraphView` instance.
   */
  createGraphView?(parent: HTMLElement, graphId: BundleGraphId, options?: BundleGraphViewOptions): BundleGraphView
}

/**
 * Provides access to the model that is contained in this bundle for use in
 * model-check packages.
 */
export interface Bundle {
  /**
   * The version of the bundle.  This should be incremented when there is an
   * incompatible change to the bundle format.  The model-check tools can use
   * this value to skip tests if two bundles have different version numbers.
   */
  version: number
  /** The spec for the bundled model. */
  modelSpec: ModelSpec
  /** Asynchronously initialize the underlying model. */
  initModel(): Promise<BundleModel>
}

/**
 * Associates a name with a `Bundle`.
 */
export interface NamedBundle {
  /** The name of the bundle, for example, "Current" or "Baseline". */
  name: string
  /** The associated bundle. */
  bundle: Bundle
}

/**
 * Represents a bundle that has had its model instances initialized.
 */
export interface LoadedBundle {
  /** The name of the bundle, for example, "Current" or "Baseline". */
  name: string
  /** The version of the bundle. */
  version: number
  /** The spec for the bundled model. */
  modelSpec: ModelSpec
  /**
   * The initialized model instances for this bundle.  If `concurrency` was specified
   * in the config, then there will be that number of model instances in this array,
   * otherwise there will be one instance.
   */
  models: BundleModel[]
}
