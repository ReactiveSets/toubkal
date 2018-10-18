#!/bin/sh

which forever > /dev/null 2>&1 && \
echo "test/server/http.js output:\n" > http.out && \
forever -m 1 -a -o http.out -e http.out start test/server/http.js && \
sleep 3 || \
echo 'forever not found, not starting test/http.js' 1>&2
