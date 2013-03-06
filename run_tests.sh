#!/bin/sh
# Runs tests for cygwin
#
# usage: ./run_tests.sh
#
# Tests results are then available in test.out

#mkdir -p node_modules/excess/lib   && \
#rm    -r node_modules/excess/lib   && \
#mkdir -p node_modules/excess/lib   && \
#cp lib/*js node_modules/excess/lib && \
npm test > test.out
