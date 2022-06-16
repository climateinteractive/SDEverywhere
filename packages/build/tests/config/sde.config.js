import { resolve as resolvePath } from 'path'

export async function config() {
  return {
    rootDir: resolvePath(__dirname, '..'),
    prepDir: resolvePath(__dirname, 'sde-prep'),
    modelFiles: [resolvePath(__dirname, '..', '_shared', 'sample.mdl')],
    plugins: [
      {
        preGenerate: async () => {
          return {
            startTime: 2000,
            endTime: 2100,
            inputVarNames: ['Y'],
            outputVarNames: ['Z'],
            datFiles: []
          }
        }
      }
    ]
  }
}
