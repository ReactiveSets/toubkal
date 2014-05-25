#!/bin/sh
#
# Search for grep pattern in source code
#
# Usage:
#  ./search.sh Compose

find './lib' './test' -not \( -path './test/javascript/*' -o -path './test/bootstrap/*' -o -path './test/lib/*' \) -regextype posix-extended -regex '(.*\.)(coffee|js|html)' -exec grep -nH "$1" {} \;
