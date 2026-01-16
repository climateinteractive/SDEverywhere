// Copyright (c) 2025 Climate Interactive / New Venture Fund

/**
 * Validate the given branch name to ensure it meets requirements for URL-safe paths.
 *
 * Allows: /, -, _, a-z, A-Z, 0-9
 *
 * @param branchName The branch name to check.
 * @throws Error if the branch name is invalid.
 */
export function validateBranchName(branchName: string): void {
  // Allow: /, -, _, a-z, A-Z, 0-9
  const validBranchPattern = /^[/\-_a-zA-Z0-9]+$/
  if (!validBranchPattern.test(branchName)) {
    throw new Error(
      `Branch name '${branchName}' contains invalid characters; branch names must only contain: /, -, _, a-z, A-Z, 0-9`
    )
  }

  // Additional validation: cannot start or end with /
  if (branchName.startsWith('/') || branchName.endsWith('/')) {
    throw new Error(`Branch name '${branchName}' cannot start or end with "/"`)
  }

  // Additional validation: cannot have consecutive slashes
  if (branchName.includes('//')) {
    throw new Error(`Branch name '${branchName}' cannot contain consecutive slashes "//"`)
  }
}
