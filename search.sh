#!/bin/sh

find './lib' './test' -regextype posix-extended -regex '(.*\.)(coffee|js|html)' -exec grep -nH "$1" {} \;
