#!/bin/sh
wc -l \
  lib/*js \
  lib/server/*js \
  lib/client/*js \
  test/*html test/*.js \
  test/src/*coffee \
  test/bin/*sh \
  test/css/*css \
  *sh package.json README.md todo.txt \
| sort -n
