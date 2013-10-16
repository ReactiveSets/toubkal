#!/bin/sh

files='lib/*js lib/server/*js'

if ( [ "$1" != "" ]; ) then
  files="$1 $2 $3 $4 $5 $6"
fi

grep -nH ToDo $files | sed -e 's/^\([^:]*\):\([^:]*\):.*ToDo/\+\2 \1/i' | less

