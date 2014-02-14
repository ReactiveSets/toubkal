#!/bin/sh
#
# Search for grep pattern in source code
#
# Usage:
#  ./search.sh Compose

find './lib' './test' -regextype posix-extended -regex '(.*\.)(coffee|js|html)' -exec grep -nH "$1" {} \;
