import { describe, expect, it } from 'vitest'

import { readDat } from './read-dat'

describe('readDat', () => {
  it('should fail if file does not exist or cannot be read', async () => {
    await expect(() => readDat('unknown_file.dat')).rejects.toThrow(
      `Failed to read dat file: ENOENT: no such file or directory, open 'unknown_file.dat'`
    )
  })
})
