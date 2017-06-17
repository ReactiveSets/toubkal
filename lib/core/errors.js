/*  errors.js
    
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
( this.undefine || require( 'undefine' )( module, require ) )()
( 'errors', [ './pipelet' ], function( rs ) {
  'use strict';
  
  var RS           = rs.RS
    , extend_2     = RS.extend._2
    , log          = RS.log
    , Union        = RS.Union
    , de           = false
    , ug           = de && log.bind( null, 'errors' )
  ;
  
  /* --------------------------------------------------------------------------
      @pipelet errors()
      
      @short Dispatches errors from producers to error subscribers
      
      @description
      This is a @singleton, @stateless, @lazy, @transactional pipelet.
      
      Emitted errors have the following attributes (not enforced):
      - **flow**       : (String) 'error'
      - **error_flow** : (String) flow of errored value
      - **operation**  : (String) 'add', 'remove', 'update' of the error
      - **sender**     : (String) sender from operation options
      - **senders**    : (Array of Strings), senders from operation options
      - **code**       : (String), error code
      - **message**    : (optional String), human-readable error message
      - **error_value**: (Object), errored value
      - **attribute**  : (optional String), attribute name associated with
                         the error
      - **position**   : (Integer), of errored value is values (see bellow)
      - **values**     : (Array of Objects), from operation values or updates
      - **engine**     : (optional String), identifying the module that
                         emitted the error
      - **[engine]**   : (optional Object) which attribute name is the same
                         as the value of the engine attribute above.
                         Containing engine-specific description of the error.
  */
  var errors = null;
  
  function Errors( options ) {
    if ( errors ) return errors;
    
    errors = this;
    
    Union.call( this, [], { name: 'errors' } );
  } // Errors()
  
  Union.Build( 'errors', Errors );
  
  /* --------------------------------------------------------------------------
     module exports
  */
  RS.Errors = Errors;
  
  return rs;
} ); // errors.js
