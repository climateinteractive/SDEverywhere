import { graphSpecs, inputSpecs } from './generated/config-specs'
import type { GraphId, GraphSpec, InputId, InputSpec } from './generated/spec-types'

/**
 * Exposes all the configuration that can be used to build a user
 * interface around the included model.
 */
export class Config {
  /**
   * @param inputs The available input specs; these are in the order expected by the model.
   * @param graphs The available graph specs.
   */
  constructor(
    public readonly inputs: ReadonlyMap<InputId, InputSpec>,
    public readonly graphs: ReadonlyMap<GraphId, GraphSpec>
  ) {}
}

/**
 * Return the default configuration for the included model instance.
 */
export function getConfig(): Config {
  // Convert the arrays from `config-specs.ts` to maps
  const inputs: Map<InputId, InputSpec> = new Map(inputSpecs.map(spec => [spec.id, spec]))
  const graphs: Map<GraphId, GraphSpec> = new Map(graphSpecs.map(spec => [spec.id, spec]))
  return new Config(inputs, graphs)
}
