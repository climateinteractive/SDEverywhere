// Copyright (c) 2026 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import {
  findVulnerablePackageNames,
  removePackagesFromLockfile,
  type DependabotAlert,
  type Lockfile
} from './refresh-lockfile.ts'

/**
 * Create a small but representative lockfile for use in the tests.
 *
 * The shape mirrors a real pnpm lockfile (version 9): `catalogs` records the
 * version that each catalog entry resolved to, `importers` records the direct
 * dependencies of each workspace package, `packages` holds one entry per
 * resolved package, and `snapshots` holds the resolved dependency graph (with
 * peer dependencies encoded as a suffix in the key).
 *
 * @returns A new lockfile object.
 */
function lockfile(): Lockfile {
  return {
    lockfileVersion: '9.0',
    catalogs: {
      default: {
        vite: { specifier: '^7.1.0', version: '7.2.2' },
        svelte: { specifier: '5.57.0', version: '5.57.0' }
      }
    },
    importers: {
      '.': {
        devDependencies: {
          vite: { specifier: 'catalog:', version: '7.2.2' },
          svelte: { specifier: 'catalog:', version: '5.57.0' }
        }
      },
      app: {
        dependencies: {
          '@testing-library/svelte': {
            specifier: '^5.2.8',
            version: '5.2.8(svelte@5.57.0)(vite@7.2.2)'
          }
        }
      }
    },
    packages: {
      'vite@7.2.2': { resolution: { integrity: 'sha512-vite' } },
      'svelte@5.57.0': { resolution: { integrity: 'sha512-svelte' } },
      '@testing-library/svelte@5.2.8': { resolution: { integrity: 'sha512-tls' } },
      'js-yaml@3.14.1': { resolution: { integrity: 'sha512-jsyaml3' } },
      'js-yaml@4.1.0': { resolution: { integrity: 'sha512-jsyaml4' } },
      'gray-matter@4.0.3': { resolution: { integrity: 'sha512-gm' } }
    },
    snapshots: {
      'vite@7.2.2': {},
      'svelte@5.57.0': {},
      '@testing-library/svelte@5.2.8(svelte@5.57.0)(vite@7.2.2)': {
        dependencies: { svelte: '5.57.0' }
      },
      'js-yaml@3.14.1': {},
      'js-yaml@4.1.0': {},
      'gray-matter@4.0.3': {
        dependencies: { 'js-yaml': '3.14.1' }
      }
    }
  }
}

/**
 * Create a Dependabot alert for use in the tests.
 *
 * @param number The alert number.
 * @param name The name of the affected package.
 * @param range The vulnerable version range, in the comma-separated form used by the API.
 * @param state The alert state.
 *
 * @returns A new alert object.
 */
function alert(number: number, name: string, range: string, state = 'open'): DependabotAlert {
  return {
    number,
    state,
    dependency: { package: { name } },
    security_advisory: { severity: 'high', summary: `${name} is vulnerable` },
    security_vulnerability: {
      vulnerable_version_range: range,
      first_patched_version: { identifier: '99.0.0' }
    }
  }
}

describe('removePackagesFromLockfile', () => {
  it('should remove the package entry for each named package', () => {
    const lock = lockfile()
    removePackagesFromLockfile(lock, ['js-yaml'])
    expect(Object.keys(lock.packages)).not.toContain('js-yaml@3.14.1')
    expect(Object.keys(lock.packages)).not.toContain('js-yaml@4.1.0')
  })

  it('should remove the snapshot entry for each named package', () => {
    const lock = lockfile()
    removePackagesFromLockfile(lock, ['js-yaml'])
    expect(Object.keys(lock.snapshots)).not.toContain('js-yaml@3.14.1')
    expect(Object.keys(lock.snapshots)).not.toContain('js-yaml@4.1.0')
  })

  it('should remove references to a named package from other snapshots', () => {
    const lock = lockfile()
    removePackagesFromLockfile(lock, ['js-yaml'])
    expect(lock.snapshots['gray-matter@4.0.3'].dependencies).toBeUndefined()
  })

  it('should remove references to a named package from importers', () => {
    const lock = lockfile()
    removePackagesFromLockfile(lock, ['vite'])
    expect(lock.importers['.'].devDependencies?.vite).toBeUndefined()
  })

  it('should remove the catalog entry for each named package', () => {
    const lock = lockfile()
    removePackagesFromLockfile(lock, ['vite'])
    expect(lock.catalogs?.default.vite).toBeUndefined()
  })

  it('should remove snapshots whose peer suffix mentions a named package', () => {
    const lock = lockfile()
    removePackagesFromLockfile(lock, ['vite'])
    expect(Object.keys(lock.snapshots)).not.toContain('@testing-library/svelte@5.2.8(svelte@5.57.0)(vite@7.2.2)')
  })

  it('should strip the peer suffix from references that mention a named package', () => {
    const lock = lockfile()
    removePackagesFromLockfile(lock, ['vite'])
    expect(lock.importers['app'].dependencies?.['@testing-library/svelte'].version).toBe('5.2.8')
  })

  it('should leave entries that do not involve a named package untouched', () => {
    const lock = lockfile()
    removePackagesFromLockfile(lock, ['js-yaml'])
    expect(lock.packages['vite@7.2.2']).toBeDefined()
    expect(lock.packages['svelte@5.57.0']).toBeDefined()
    expect(lock.snapshots['svelte@5.57.0']).toBeDefined()
    expect(lock.catalogs?.default.svelte).toBeDefined()
    expect(lock.importers['.'].devDependencies?.svelte.version).toBe('5.57.0')
    // The peer suffix here mentions only packages that were left alone
    expect(lock.importers['app'].dependencies?.['@testing-library/svelte'].version).toBe(
      '5.2.8(svelte@5.57.0)(vite@7.2.2)'
    )
  })

  it('should not treat a package as named when only its version suffix matches', () => {
    const lock = lockfile()
    // 'yaml' is a prefix-free substring of 'js-yaml'; make sure we match on the
    // full package name and not on a substring
    removePackagesFromLockfile(lock, ['yaml'])
    expect(lock.packages['js-yaml@3.14.1']).toBeDefined()
  })

  it('should report what was removed', () => {
    const lock = lockfile()
    const stats = removePackagesFromLockfile(lock, ['js-yaml'])
    expect(stats.packages).toBe(2)
    expect(stats.snapshots).toBe(2)
    expect(stats.references).toBe(1)
  })
})

describe('findVulnerablePackageNames', () => {
  it('should flag a package whose installed version is in the vulnerable range', () => {
    const names = findVulnerablePackageNames(lockfile(), [alert(1, 'js-yaml', '>= 3.0.0, < 3.15.2')])
    expect(names).toEqual(['js-yaml'])
  })

  it('should flag a package when any one of its installed versions is vulnerable', () => {
    const names = findVulnerablePackageNames(lockfile(), [alert(1, 'js-yaml', '>= 4.0.0, < 4.3.2')])
    expect(names).toEqual(['js-yaml'])
  })

  it('should ignore alerts that are not open', () => {
    const names = findVulnerablePackageNames(lockfile(), [
      alert(1, 'js-yaml', '>= 3.0.0, < 3.15.2', 'fixed'),
      alert(2, 'vite', '<= 7.3.4', 'dismissed')
    ])
    expect(names).toEqual([])
  })

  it('should ignore alerts for packages that are not installed', () => {
    const names = findVulnerablePackageNames(lockfile(), [alert(1, 'lodash', '<= 4.17.21')])
    expect(names).toEqual([])
  })

  it('should ignore alerts whose installed version is already patched', () => {
    const names = findVulnerablePackageNames(lockfile(), [alert(1, 'vite', '< 7.0.0')])
    expect(names).toEqual([])
  })

  it('should return each package name only once', () => {
    const names = findVulnerablePackageNames(lockfile(), [
      alert(1, 'js-yaml', '>= 3.0.0, < 3.15.2'),
      alert(2, 'js-yaml', '>= 4.0.0, < 4.3.2')
    ])
    expect(names).toEqual(['js-yaml'])
  })

  it('should handle scoped package names', () => {
    const names = findVulnerablePackageNames(lockfile(), [alert(1, '@testing-library/svelte', '<= 5.2.8')])
    expect(names).toEqual(['@testing-library/svelte'])
  })
})
