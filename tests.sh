#!/bin/sh

mocha -R spec --compilers coffee:coffee-script test/xs_tests.coffee && \
# add more test suites here
true
