#!/bin/sh
#
# Replace text in source code using sed expression.
#
# Usage:
#   ./replace.sh s/test_replace/test_replaced/

find './lib' './test' -not \(  -path './test/javascript/*' -o -path './test/bootstrap/*' \) -regextype posix-extended -regex '(.*\.)(coffee|js|html)' -exec sed -i -e "$1" {} \;
