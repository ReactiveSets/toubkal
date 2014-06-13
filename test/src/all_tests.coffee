###
    xs_all_tests.coffee
    
    Copyright (C) 2013, 2014, Connected Sets
    
    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation, either version 3 of the
    License, or (at your option) any later version.
    
    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.
    
    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
    
###

# -------------------------------------------------------------------------------
# require modules tests
# ---------------------

require './clone_tests.js'
require './trace_domain.js'
require './query.js'
require './transactions.js'
require './core.js'
require './json.js'
require './transforms.js'
require './file.js'

try
  require.resolve 'zombie'
  require './ui.js'       

fs = require 'fs'

require './passport.js' if fs.existsSync '~/config.xs.json'

