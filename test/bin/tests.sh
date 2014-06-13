#!/bin/sh
# Usage:
#   ./test/bin/tests.sh [target]
#
# Where target can be:
#   empty-string or "all": all coffee source are compiled and executed
#   non-empty string: test/src/$1.coffee is compiled and test/lib/$1.js is executed

if [ "$1" = "" ]; then
  test=all
else
  test=$1
fi

echo tests $test
echo

coffee --version
which coffee
echo
echo "Compile Coffee tests"

mkdir -p test/lib

if [ $test = "all" ]; then
  coffee --map --output test/lib --compile test/src
  
  test=test/lib/all_tests.js
else
  coffee --map --output test/lib --compile test/src/$test.coffee
  
  test=test/lib/$test.js
fi

echo tests $test
echo
echo "Run tests"
mocha -R mocha-unfunk-reporter $test
