#!/bin/sh
# Runs tests for cygwin
#
# Prior to running the tests, this root directory must contain a node_modules directory
# Where a link to excess exists. This link is (removed and) created by this script.
#
# usage: ./run_tests.sh
#
# Tests results are then available in test.out

mkdir -p node_modules/excess/lib   && \
rm    -r node_modules/excess/lib   && \
mkdir -p node_modules/excess/lib   && \
cp lib/*js node_modules/excess/lib && \
npm test > test.out
