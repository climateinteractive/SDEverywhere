#!/bin/bash

#
# This script verifies that:
#  1. The `sde bundle` command does not hang indefinitely if the model-check
#     SuiteRunner encounters an unhandled error during a model run.
#  2. The exit code is non-zero when the SuiteRunner reports an error.
#  3. The error message is reported in the build output.
#

set +e # don't fail on error

# The first argument selects the build variant: "js" or "wasm"
variant="$1"
if [ "$variant" != "js" ] && [ "$variant" != "wasm" ]; then
  echo "Usage: $0 <js|wasm>"
  exit 1
fi

# Run the build and capture stdout/stderr to a log file.  The build should
# complete (or fail) within a few seconds; if it hangs, the timeout will
# kill it and we'll fail the test.
log_file=$(mktemp)
trap "rm -f $log_file" EXIT

echo "Running 'sde bundle' (expecting a runtime error)..."
echo

# Use perl as a portable timeout that works on macOS too
perl -e 'alarm shift; exec @ARGV' 60 pnpm "build-$variant" > "$log_file" 2>&1
exit_code=$?

# Print the build output for context
cat "$log_file"
echo

# Check 1: The build did not hang (exit code 142 is what perl alarm uses on SIGALRM)
if [ $exit_code -eq 142 ] || [ $exit_code -eq 14 ]; then
  echo "Test failed: 'sde bundle' did not complete within 60s (suite-runner is hanging)"
  echo
  exit 1
fi

# Check 2: The exit code is non-zero
if [ $exit_code -eq 0 ]; then
  echo "Test failed: 'sde bundle' reported exit code 0, but a non-zero exit code was expected"
  echo
  exit 1
fi

# Check 3: The error message appears in the output
if ! grep -q "Simulated runtime error from getDatasetsForScenario" "$log_file"; then
  echo "Test failed: expected error message was not found in the build output"
  echo
  exit 1
fi

echo "Test passed: 'sde bundle' completed quickly with exit code $exit_code and reported the runtime error"
echo
