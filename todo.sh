#!/bin/sh

files='*sh *.md lib bin test examples'

if ( [ "$1" != "" ]; ) then
  files="$1 $2 $3 $4 $5 $6"
fi

find $files                \
  -regextype posix-egrep   \
  -regex '.*[^~]'          \
  -type f                  \
  -exec grep -nH ToDo {} + \
| sed -e 's/^\([^:]*\):\([^:]*\):.*ToDo/\+\2 \1/i' \
| less
