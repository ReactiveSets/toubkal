#!/bin/sh

which forever > /dev/null 2>&1 && forever stop test/server/http.js || true
