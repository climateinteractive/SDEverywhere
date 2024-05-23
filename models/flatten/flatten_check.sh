#!/bin/bash

MODEL_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJ_DIR="$MODEL_DIR/../.."
SDE_MAIN="$PROJ_DIR/packages/cli/src/main.js"

cd $MODEL_DIR
node "$SDE_MAIN" flatten output.mdl --inputs input1.mdl input2.mdl

diff expected.mdl build/output.mdl > build/diff.txt 2>&1
if [ $? != 0 ]; then
  echo
  echo "ERROR: 'sde flatten' produced unexpected results:"
  echo
  cat build/diff.txt
  echo
  exit 1
fi

PRECISION="1e-4"
cp expected.dat build/output.dat
node "$SDE_MAIN" test --genformat=$GEN_FORMAT -p $PRECISION $MODEL_DIR/build/output.mdl
if [ $? != 0 ]; then
  exit 1
fi

echo
echo "All validation checks passed!"
