#!/bin/sh
#
# Runs toubkal tests
#
# Assumes that ./node_modules/toubkal links to this root repository
# to allow to test scripts to require( "toubkal" ).
#
# This can be achieved by running:
#   npm link
#
# After which
#   ls -l node_modules
#
# should show:
#   lrwxrwxrwx toubkal -> ..
#
# Usage:
#   ./run_tests.sh [target]
#
# Where target can be:
#   empty-string: uses npm test to run all tests, possibly running pretest and posttest scripts
#   all     : all coffee source are compiled and executed using npm test
#   ui      : all ui tests launching test/server/http.js, redirecting results to http.out
#   <other> : ./test/src/$1.coffee is compiled and ./test/lib/$1.js is executed
#
# Tests results are then available in test.out and http.out for ui tests
#
if [ "$1" = "" ]; then
  npm test 2>&1 > test.out || echo " test failed"
else
  if [ "$1" = "list" ]; then
    ls test/lib/*js \
      | sed -e 's/test\/lib\/\(.*\)\.js/\1/' \
      | egrep -v 'ui_tests|url_events|url_pattern|all_tests|control|controlsform_tests|form|sketchfab|tests_utils|table|load_images' \
      | column
    
    exit 0
  fi
  
  ./test/bin/tests.sh $1 2>&1 > test.out || echo " test failed"

fi

echo

grep '[[:cntrl:]]' test.out

echo
echo "To get full test results: less -R test.out"

if [ "$1" = "ui" ] || [ "$1" = "" ]; then
  printf "\nTo see test/server/http.js stdout and stderr: less http.out\n"
fi
