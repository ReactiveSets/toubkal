/*
  core.js
   
  Copyright (c) 2013-2017, Reactive Sets

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
*/
'use strict';

module.exports = require( './core/pipelet' );

[   'filter'
  , 'trace'
  , 'store'
  , 'dispatch'
  , 'stateful'
  , 'group_by'
  , 'transforms'
  , 'operations'
  , 'order'
  , 'aggregate'
  , 'join'
  , 'input_set'
  , 'json'
  , 'events'
  , 'transactional'
  , 'next'
  , 'validate'
  , 'last'
  , 'optimize'
  , 'application_loop'
  , 'uri'
  
].forEach( function( module ) {
  require( './core/' + module );
} );

require( './client/form.js' );

// core.js
