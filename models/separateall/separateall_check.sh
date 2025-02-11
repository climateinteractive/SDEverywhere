#!/bin/bash

MODEL_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJ_DIR="$MODEL_DIR/../.."
SDE_MAIN="$PROJ_DIR/packages/cli/src/main.js"

cd $MODEL_DIR
node "$SDE_MAIN" generate --list --spec separateall_spec.json separateall.mdl

grep 'refId(_a\[_a1\])' build/separateall_vars.txt >/dev/null
if [ $? != 0 ]; then
  echo "ERROR: separateall listing did not include _a[_a1]"
  exit 1
fi

grep 'refId(_b\[_b1\])' build/separateall_vars.txt >/dev/null
if [ $? != 0 ]; then
  echo "ERROR: separateall listing did not include _b[_b1]"
  exit 1
fi

echo "All validation checks passed!"
