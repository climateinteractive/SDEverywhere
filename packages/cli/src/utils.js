export let execCmd = cmd => {
  // Run a command line silently in the "sh" shell. Print error output on error.
  let exitCode = 0
  let result = sh.exec(cmd, { silent: true })
  if (result.code !== 0) {
    console.error(result.stderr)
    exitCode = result.code
  }
  return exitCode
}
