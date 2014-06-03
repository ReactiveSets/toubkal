#!/bin/sh
#
# Search for grep pattern in source code
#
# Usage:
#  ./search.sh Compose

find . -not \( \
     -path '.git*' \
  -o -path './node_modules/*' \
  -o -path './bin/*' \
  -o -path './test/javascript/*' \
  -o -path './test/bootstrap/*' \
  -o -path './test/lib/*' \
\) -regextype posix-extended -regex '(.*\.)(coffee|js|html|txt|md|yml)' \
-exec grep -nH "$1" {} \;
