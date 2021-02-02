#!/bin/bash

MODEL_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $MODEL_DIR
C_FILE=build/prune.c

function expect_present {
  grep -q "$1" $C_FILE
  if [[ $? != 0 ]]; then
    echo "ERROR: Did not find string '$1' this is expected to appear in $C_FILE"
    exit 1
  fi
}

function expect_not_present {
  grep -q "$1" $C_FILE
  if [[ $? != 1 ]]; then
    echo "ERROR: Found string '$1' that is expected to not appear in $C_FILE"
    exit 1
  fi
}

# Verify that used variables do appear in the generated C file
expect_present "_final_time"
expect_present "_initial_time"
expect_present "_saveper"
expect_present "_time_step"
expect_present "_input_1"
expect_present "_input_2"
expect_present "_a_values"
expect_present "_bc_values"
expect_present "_simple_1"
expect_present "_simple_2"
expect_present "_a_totals"
expect_present "_b1_totals"
expect_present "_input_1_and_2_total"
expect_present "_simple_totals"
expect_present "__lookup1"
expect_present "_look1"
expect_present "_look1_value_at_t1"
expect_present "_with_look1_at_t1"
expect_present "_constant_partial_1"
expect_present "_constant_partial_2"
expect_present "_initial_partial"
expect_present "_partial"

# Verify that unreferenced variables do not appear in the generated C file
expect_not_present "_input_3"
expect_not_present "_d_values"
expect_not_present "_e_values"
expect_not_present "_e1_values"
expect_not_present "_e2_values"
expect_not_present "_d_totals"
expect_not_present "_input_2_and_3_total"
expect_not_present "__lookup2"
expect_not_present "_look2"
expect_not_present "_look2_value_at_t1"
expect_not_present "_with_look2_at_t1"

echo "All validation checks passed!"
