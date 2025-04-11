#!/bin/bash

#
# This script verifies that the exit code of the `sde bundle` command is 2 when the
# `plugin-check` plugin reports that one or more check tests failed.
#

set +e # don't fail on error

pnpm build-js

echo
if [ $? -ne 2 ]; then
  echo "Test failed: 'sde bundle' reported exit code $? but the expected exit code is 2"
  echo
  exit 1
else
  echo "Test passed: 'sde bundle' reported exit code 2 as expected"
  echo
fi
