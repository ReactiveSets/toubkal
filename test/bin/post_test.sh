#!/bin/sh

which forever > /dev/null 2>&1 && forever stop  test/http.js || true
