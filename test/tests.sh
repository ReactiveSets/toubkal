#!/bin/sh

coffee --version
which coffee
echo
echo "Compile Coffee tests"

coffee -m -c test/xs_tests_utils.coffee
coffee -m -c test/clone_tests.coffee
coffee -m -c test/xs_core.coffee
coffee -m -c test/xs_url.coffee
coffee -m -c test/xs_controls.coffee
coffee -m -c test/xs_ui.coffee
coffee -m -c test/xs_all_tests.coffee
coffee -m -c test/xs_file.coffee
coffee -m -c test/xs_transforms.coffee
coffee -m -c test/xs_json.coffee

echo
echo "Run tests"
mocha -R mocha-unfunk-reporter test/xs_all_tests.js
