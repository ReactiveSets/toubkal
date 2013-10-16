#!/bin/sh

mocha -R spec --compilers coffee:coffee-script test/xs_core.coffee && \
# add more test suites here
true
