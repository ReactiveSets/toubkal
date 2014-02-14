#!/bin/sh
#
# Replace text in source code using sed expression.
#
# Usage:
#   ./replace.sh s/test_replace/test_replaced/

find './lib' './test' -regextype posix-extended -regex '(.*\.)(coffee|js|html)' -exec sed -i -e "$1" {} \;
