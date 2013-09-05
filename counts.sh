#!/bin/sh
wc -l \
  lib/*js \
  lib/server/*js \
  test/*coffee test/*html \
  test/http.js test/ec2.js test/configuration.js test/images_processing.js \
  *sh package.json README.md todo.txt \
| sort -n
