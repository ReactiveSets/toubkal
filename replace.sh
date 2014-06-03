#!/bin/sh
#
# Replace text in source code using sed expression.
#
# Usage:
#   ./replace.sh s/test_replace/test_replaced/

find . -not \( \
     -path '.git*' \
  -o -path './node_modules/*' \
  -o -path './bin/*' \
  -o -path './test/javascript/*' \
  -o -path './test/bootstrap/*' \
  -o -path './test/lib/*' \
\) -regextype posix-extended -regex '(.*\.)(coffee|js|html|txt|md|yml)' \
-exec sed -i -e "$1" {} \;
