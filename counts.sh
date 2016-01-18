#!/bin/sh
echo "Tests:"

find test \
  -type d \( \
       -path test/bootstrap \
    -o -path test/deprecated \
    -o -path test/lib \
    -o -path test/javascript \
    -o -path test/images \
    -o -path test/css/images \
  \) \
  -prune -o \
  -regextype posix-egrep -regex '.*[^~]' \
  -type f \
  -exec wc -l {} + \
| sort -n

echo
echo "Source:"

find *sh *.json *.md .travis.yml lib bin examples \
  ! -name '*.json' \
  -regextype posix-egrep \
  -regex '.*[^~]' \
  -type f \
  -exec wc -l {} + \
| sort -n

exit 0
