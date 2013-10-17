#!/bin/sh
coffee -c test/xs_tests_utils.coffee
coffee -c test/xs_core.coffee

mocha -R spec test/xs_core.js && \
# add more test suites here
true
