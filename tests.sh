#!/bin/sh
coffee --version
which coffee
echo
echo "Compile Coffee tests"
coffee -m -c test/xs_tests_utils.coffee
coffee -m -c test/xs_core.coffee
echo
echo "Run tests"
node node_modules/node-uuid/test/test.js && \
mocha -R spec test/xs_core.js && \
# add more test suites here
true
