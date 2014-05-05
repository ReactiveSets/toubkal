#!/bin/sh
find *sh *.json *.md *.txt .travis.yml lib test bin \
  -type d \( \
       -path test/bootstrap \
    -o -path test/deprecated \
    -o -path test/lib \
    -o -path test/javascript \
    -o -path test/images \
    -o -path test/css/images \
  \) \
  -prune -o \
  -regextype posix-egrep \
  -regex '.*[^~]' \
  -type f \
  -exec wc -l {} + \
| sort -n

exit 0

# Previous method:
wc -l \
  lib/*js \
  lib/server/*js \
  lib/client/*js \
  test/README.txt test/*html test/*.js \
  test/src/*coffee \
  test/bin/*sh \
  test/css/*css \
  test/fixtures/file/config.json \
  *sh *.json *.md *.txt .travis.yml bin/uuid_v4 \
| sort -n
