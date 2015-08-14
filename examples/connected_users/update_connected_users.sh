#!/bin/bash

node.exe update_connected_users.js > update_connected_users.log &
node.exe server.js
