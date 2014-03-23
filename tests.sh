#!/bin/sh
coffee --version
which coffee
echo
echo "Compile Coffee tests"

coffee -m -c test/xs_tests_utils.coffee
coffee -m -c test/clone_tests.coffee
coffee -m -c test/xs_core.coffee
coffee -m -c test/xs_url.coffee
coffee -m -c test/xs_ui.coffee
coffee -m -c test/xs_all_tests.coffee

echo
echo "Run tests"
mocha -R mocha-unfunk-reporter test/xs_all_tests.js && \
# add more test suites here
true
