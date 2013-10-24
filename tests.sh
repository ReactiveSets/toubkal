#!/bin/sh
coffee -c test/xs_tests_utils.coffee
coffee -c test/xs_core.coffee

node node_modules/node-uuid/test/test.js && \
mocha -R spec test/xs_core.js && \
# add more test suites here
true
