#!/bin/sh

mkdir -p test/lib

coffee --watch --map --output test/lib --compile test/src
