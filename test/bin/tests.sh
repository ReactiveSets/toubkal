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

if [ "$1" = "" ] || [ "$1" = "all" ] || [ "$1" = "ui" ]; then
  printf "test/server/http.js output:\n\n" > http.out
  
  node test/server/http.js >> http.out & echo $! > node_http.pid
  
  sleep 3
  
  if [ "$1" = "ui" ]; then
    sleep 15
  fi
fi

coffee --version
which coffee
echo
echo "Compile Coffee tests"

mkdir -p test/lib

if [ $test = "all" ]; then
  coffee --map --output test/lib --compile test/src
  
  test=test/lib/all_tests.js
else
  coffee --map --output test/lib --compile test/src/tests_utils.coffee
  coffee --map --output test/lib --compile test/src/$test.coffee
  
  if [ $test = "ui" ]; then
    coffee --map --output test/lib --compile \
      test/src/url_events.coffee \
      test/src/controls.coffee \
      test/src/form.coffee
  fi
  
  test=test/lib/$test.js
fi

echo Run tests $test
echo npm version `npm --version`
echo mocha version `npx mocha --version`
npx mocha -R mocha-unfunk-reporter --exit $test

if [ "$1" = "" ] || [ "$1" = "all" ] || [ "$1" = "ui" ]; then
  echo kill test/server/http.js, pid: `cat node_http.pid` >> http.out
  
  kill `cat node_http.pid`
  
  rm node_http.pid
fi
