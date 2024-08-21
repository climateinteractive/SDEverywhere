import { resolve as resolvePath } from 'path'

export async function config() {
  return {
    rootDir: resolvePath(__dirname, '..'),
    prepDir: resolvePath(__dirname, 'sde-prep'),
    modelFiles: [resolvePath(__dirname, '..', '_shared', 'sample.mdl')],
    modelSpec: async () => {
      return {
        inputs: [{ varName: 'Y', defaultValue: 0, minValue: -10, maxValue: 10 }],
        outputs: [{ varName: 'Z' }]
      }
    }
  }
}
