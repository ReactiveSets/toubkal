#!/bin/sh

# Delete all backup files in all sub-directories
find -name '*~' -exec rm {} ';'

npm publish
