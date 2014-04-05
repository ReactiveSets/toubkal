#!/bin/sh

coffee --version
which coffee
echo
echo "Compile Coffee tests"

mkdir -p test/lib

coffee --map --output test/lib --compile test/src

echo
echo "Run tests"
mocha -R mocha-unfunk-reporter test/lib/xs_all_tests.js
