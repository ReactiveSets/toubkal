#!/bin/sh
# Runs Connected Sets tests
#
# Assumes that node_modules/excess links to this repository root. This can be achieved
# by running 'npm link' after which 'ls -l node_modules' should show:
#   excess -> ../.
#
# Usage:
#   ./run_tests.sh [target]
#
# Where target can be:
#   empty-string: uses npm test to run all tests, possibly running pretest and posttest scripts
#   "all"       : all coffee source are compiled and executed
#   other       : ./test/src/$1.coffee is compiled and ./test/lib/$1.js is executed
#
# Tests results are then available in test.out
#
if [ "$1" = "" ]; then
  npm test > test.out || echo " test failed"
else
  ./test/bin/tests.sh $1 > test.out || echo " test failed"
fi

echo

grep '[[:cntrl:]]' test.out

echo
echo "To get full test results: less -R test.out"
