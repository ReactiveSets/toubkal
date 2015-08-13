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
