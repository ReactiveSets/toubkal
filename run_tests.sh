#!/bin/sh
# Runs tests for cygwin
#
# Prior to running the tests, this root directory must contain a node_modules directory
# Where a link to excess exists. This link is (removed and) created by this script.
#
# usage: ./run_tests.sh
#
# Tests results are then available in test.out

mkdir -p node_modules
rm node_modules/excess
ln -s ../. node_modules/excess
npm test > test.out
