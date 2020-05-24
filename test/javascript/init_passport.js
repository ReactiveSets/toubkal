/*
    init_passport.js

    Copyright (C) 2013, 2014, Reactive Sets

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

( function( exports ) {
//var $node = document.body;

var socket_io_server = rs
  .socket_io_server()
;

exports.profile   = socket_io_server.flow( 'user_profile' ).set();
exports.providers = socket_io_server.flow( 'providers'    ).set();
} ) ( this );