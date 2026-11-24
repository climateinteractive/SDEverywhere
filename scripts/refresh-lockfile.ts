#!/usr/bin/env node

//
// This script refreshes selected entries in `pnpm-lock.yaml` so that pnpm re-resolves
// them to the newest version allowed by the semver range that each dependent already
// declares.  It is mainly useful for clearing Dependabot alerts that are caused by
// stale transitive dependencies.
//
// The point of doing this surgically rather than deleting the whole lockfile is to
// limit the blast radius: a full refresh re-resolves every package in the tree (which
// tends to churn hundreds of unrelated packages), whereas this only touches the
// packages we ask for, plus whatever they drag along.
//
// Note that `pnpm update <pkg>` is not an alternative here; it only updates direct
// dependencies of the workspace packages, so it leaves stale transitive dependencies
// alone (and can even end up duplicating them in the lockfile).
//
// Usage:
//   ./scripts/refresh-lockfile.ts                  # refresh packages with open Dependabot alerts
//   ./scripts/refresh-lockfile.ts pkg [pkg...]     # refresh the named packages
//   ./scripts/refresh-lockfile.ts --dry-run [...]  # report what would change, but don't write
//
// The first form requires the GitHub CLI (`gh`) to be installed and authenticated.
//

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'

import semver from 'semver'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'

/** A reference to a resolved package, as recorded by an importer in the lockfile. */
export interface LockfileImporterDep {
  /** The version range declared in the `package.json` (or `catalog:`). */
  specifier: string
  /** The resolved version, possibly followed by a peer dependency suffix. */
  version: string
}

/** The direct dependencies of a single workspace package. */
export interface LockfileImporter {
  dependencies?: Record<string, LockfileImporterDep>
  devDependencies?: Record<string, LockfileImporterDep>
  optionalDependencies?: Record<string, LockfileImporterDep>
}

/** The resolved dependencies of a single package in the dependency graph. */
export interface LockfileSnapshot {
  dependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
}

/** The parsed contents of a `pnpm-lock.yaml` file (version 9). */
export interface Lockfile {
  lockfileVersion: string
  /** The version that each catalog entry resolved to, keyed by catalog name. */
  catalogs?: Record<string, Record<string, LockfileImporterDep>>
  /** The direct dependencies of each workspace package, keyed by package directory. */
  importers: Record<string, LockfileImporter>
  /** One entry per resolved package, keyed by `name@version`. */
  packages: Record<string, unknown>
  /** The resolved dependency graph, keyed by `name@version` plus a peer suffix. */
  snapshots: Record<string, LockfileSnapshot>
}

/** A single Dependabot alert, as returned by the GitHub API. */
export interface DependabotAlert {
  number: number
  state: string
  dependency: {
    package: {
      name: string
    }
  }
  security_advisory: {
    severity: string
    summary: string
  }
  security_vulnerability: {
    /** The vulnerable range, for example `>= 3.0.0, < 3.15.2`. */
    vulnerable_version_range: string
    first_patched_version?: {
      identifier: string
    }
  }
}

/** A count of the entries that were removed from a lockfile. */
export interface RemovalStats {
  /** The number of removed `packages` entries. */
  packages: number
  /** The number of removed `snapshots` entries. */
  snapshots: number
  /** The number of removed references to a removed package. */
  references: number
  /** The number of references that had a peer dependency suffix stripped. */
  strippedPeers: number
}

/**
 * Split a lockfile key such as `js-yaml@3.14.1` or `@vitest/mocker@4.0.8` into
 * the package name.  Note that the leading `@` of a scoped name is ignored, so
 * only the separator before the version is considered.
 *
 * @param key The lockfile key, without any peer dependency suffix.
 *
 * @returns The package name.
 */
function packageNameFromKey(key: string): string {
  return key.slice(0, key.lastIndexOf('@'))
}

/**
 * Determine whether the peer dependency suffix of a lockfile key or version
 * reference mentions one of the given packages.
 *
 * A suffix looks like `(svelte@5.57.0)(vite@7.2.2(@types/node@22.19.0))`, and can
 * be nested, so this scans for every `name@` that follows an opening parenthesis
 * or a comma.
 *
 * @param value The lockfile key or version reference.
 * @param names The package names of interest.
 *
 * @returns True if the suffix mentions one of the given packages.
 */
function peersMentionPackage(value: string, names: Set<string>): boolean {
  const parenIndex = value.indexOf('(')
  if (parenIndex < 0) {
    return false
  }
  const suffix = value.slice(parenIndex)
  for (const match of suffix.matchAll(/[(,]\s*(@?[^()@,]+(?:\/[^()@,]+)?)@/g)) {
    if (names.has(match[1])) {
      return true
    }
  }
  return false
}

/**
 * Drop the peer dependency suffix from a version reference if that suffix mentions
 * one of the given packages.  Dropping it forces pnpm to recompute the suffix
 * against the newly resolved peers.
 *
 * @param value The version reference.
 * @param names The package names of interest.
 *
 * @returns The version reference, with the peer dependency suffix removed if needed.
 */
function stripPeers(value: string, names: Set<string>): string {
  return peersMentionPackage(value, names) ? value.slice(0, value.indexOf('(')) : value
}

/**
 * Remove every trace of the given packages from a parsed lockfile, so that a
 * subsequent `pnpm install` re-resolves them.
 *
 * All four places that pin a version have to be cleared, otherwise pnpm will
 * simply restore the version that is already there: the `packages` and `snapshots`
 * entries, the references to them from other snapshots and from the importers, and
 * the `catalogs` section (which pins catalog entries independently of the version
 * range declared in `pnpm-workspace.yaml`).
 *
 * Note that the lockfile is modified in place.
 *
 * @param lock The parsed lockfile.
 * @param packageNames The names of the packages to remove.
 *
 * @returns A count of the entries that were removed.
 */
export function removePackagesFromLockfile(lock: Lockfile, packageNames: Iterable<string>): RemovalStats {
  const names = new Set(packageNames)
  const stats: RemovalStats = { packages: 0, snapshots: 0, references: 0, strippedPeers: 0 }

  for (const key of Object.keys(lock.packages ?? {})) {
    if (names.has(packageNameFromKey(key))) {
      delete lock.packages[key]
      stats.packages++
    }
  }

  for (const key of Object.keys(lock.snapshots ?? {})) {
    const base = key.split('(')[0]
    if (names.has(packageNameFromKey(base)) || peersMentionPackage(key, names)) {
      delete lock.snapshots[key]
      stats.snapshots++
    }
  }

  for (const snapshot of Object.values(lock.snapshots ?? {})) {
    for (const section of ['dependencies', 'optionalDependencies'] as const) {
      const deps = snapshot[section]
      if (deps === undefined) {
        continue
      }
      for (const [dep, version] of Object.entries(deps)) {
        if (names.has(dep)) {
          delete deps[dep]
          stats.references++
          continue
        }
        const stripped = stripPeers(version, names)
        if (stripped !== version) {
          deps[dep] = stripped
          stats.strippedPeers++
        }
      }
      if (Object.keys(deps).length === 0) {
        delete snapshot[section]
      }
    }
  }

  for (const catalog of Object.values(lock.catalogs ?? {})) {
    for (const dep of Object.keys(catalog)) {
      if (names.has(dep)) {
        delete catalog[dep]
        stats.references++
      }
    }
  }

  for (const importer of Object.values(lock.importers ?? {})) {
    for (const section of ['dependencies', 'devDependencies', 'optionalDependencies'] as const) {
      const deps = importer[section]
      if (deps === undefined) {
        continue
      }
      for (const [dep, info] of Object.entries(deps)) {
        if (names.has(dep)) {
          delete deps[dep]
          stats.references++
          continue
        }
        const stripped = stripPeers(info.version, names)
        if (stripped !== info.version) {
          info.version = stripped
          stats.strippedPeers++
        }
      }
      if (Object.keys(deps).length === 0) {
        delete importer[section]
      }
    }
  }

  return stats
}

/**
 * Collect the version of every package in the lockfile.
 *
 * @param lock The parsed lockfile.
 *
 * @returns A map from package name to the set of versions present in the lockfile.
 */
function installedVersions(lock: Lockfile): Map<string, string[]> {
  const versions = new Map<string, string[]>()
  for (const key of Object.keys(lock.packages ?? {})) {
    const name = packageNameFromKey(key)
    const version = key.slice(key.lastIndexOf('@') + 1)
    const existing = versions.get(name)
    if (existing !== undefined) {
      existing.push(version)
    } else {
      versions.set(name, [version])
    }
  }
  return versions
}

/**
 * Find the packages that have an open Dependabot alert matching a version that is
 * actually present in the lockfile.
 *
 * Alerts that are already fixed or dismissed are ignored, as are alerts for a
 * version that is no longer installed.
 *
 * @param lock The parsed lockfile.
 * @param alerts The Dependabot alerts.
 *
 * @returns The names of the affected packages, in the order they were encountered.
 */
export function findVulnerablePackageNames(lock: Lockfile, alerts: DependabotAlert[]): string[] {
  const versions = installedVersions(lock)
  const names: string[] = []

  for (const alert of alerts) {
    if (alert.state !== 'open') {
      continue
    }
    const name = alert.dependency.package.name
    if (names.includes(name)) {
      continue
    }
    const installed = versions.get(name)
    if (installed === undefined) {
      continue
    }
    // The API reports the range with comma separators, but semver wants spaces
    const range = alert.security_vulnerability.vulnerable_version_range.replace(/,/g, ' ')
    if (installed.some(version => semver.satisfies(version, range))) {
      names.push(name)
    }
  }

  return names
}

/**
 * Read the open Dependabot alerts for this repository using the GitHub CLI.
 *
 * @returns The alerts.
 *
 * @throws An error if the GitHub CLI is unavailable or the request fails.
 */
function readDependabotAlerts(): DependabotAlert[] {
  const json = execFileSync('gh', ['api', 'repos/:owner/:repo/dependabot/alerts', '--paginate'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
  })
  return JSON.parse(json) as DependabotAlert[]
}

function main(): void {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const requestedNames = args.filter(arg => !arg.startsWith('--'))

  const projDir = resolvePath(dirname(fileURLToPath(import.meta.url)), '..')
  const lockPath = resolvePath(projDir, 'pnpm-lock.yaml')
  const lock = parseYaml(readFileSync(lockPath, 'utf8')) as Lockfile

  let names: string[]
  if (requestedNames.length > 0) {
    names = requestedNames
  } else {
    console.log('Reading Dependabot alerts...')
    const alerts = readDependabotAlerts()
    names = findVulnerablePackageNames(lock, alerts)
    const openCount = alerts.filter(alert => alert.state === 'open').length
    console.log(`Found ${openCount} open alerts covering ${names.length} installed packages`)
  }

  if (names.length === 0) {
    console.log('Nothing to refresh')
    return
  }

  console.log(`Refreshing: ${names.join(', ')}`)
  const stats = removePackagesFromLockfile(lock, names)
  console.log(
    `Removed ${stats.packages} packages, ${stats.snapshots} snapshots, ` +
      `${stats.references} references; stripped ${stats.strippedPeers} peer suffixes`
  )

  if (dryRun) {
    console.log('Dry run; leaving the lockfile alone')
    return
  }

  // Write the pruned lockfile, then let pnpm re-resolve the missing entries and
  // rewrite the file in its own canonical format.
  //
  // Note that `--fix-lockfile` is essential here.  A plain `pnpm install` compares the
  // lockfile against the `package.json` manifests to decide whether to re-resolve, and
  // pruning a transitive package doesn't change any importer's declared dependencies, so
  // pnpm reports "Lockfile is up to date, resolution step is skipped" and never rewrites
  // the file.  That leaves the lockfile in the `yaml` package's formatting (double-quoted
  // keys, no blank line separators), which shows up as a diff of several thousand
  // cosmetic lines.  `--fix-lockfile` treats the missing entries as breakage to repair,
  // so pnpm re-resolves just those and writes the file back in its own format.
  writeFileSync(lockPath, stringifyYaml(lock, { lineWidth: 0 }))
  console.log('Running `pnpm install`...')
  execFileSync('pnpm', ['install', '--fix-lockfile'], { cwd: projDir, stdio: 'inherit' })
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
