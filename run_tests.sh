#!/bin/sh
# Runs tests for cygwin
#
# Assumes that node_modules/excess links to this repository root. This can be achieved
# by running 'npm link' after which 'ls -l node_modules' should show:
#   excess -> ../.
#
# usage: ./run_tests.sh
#
# Tests results are then available in test.out

npm test > test.out || echo " test failed"

echo

tail -n 10 test.out | egrep 'passed ([0-9]*).*of \1[^0-9].*tests'

echo
echo "Get full test results: less -R test.out"

