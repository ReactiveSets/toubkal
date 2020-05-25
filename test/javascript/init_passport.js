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
  var $sign_in         = document.querySelector( '#sign-in' )
    , $profile         = document.querySelector( '#profile' )
    , socket_io_server = exports.rs.socket_io_server()
  ;

  var providers = socket_io_server.flow( 'providers' );

  providers
    .greedy()
    
    .api
    
    .on( 'add', function( added ) {
      signin_html( $sign_in, added );
    } )
    
    .on( 'remove', function( removed ) {
      $sign_in.innerHTML = '';
    } )
    
    .on( 'update', function( updates ) {
      signin_html( $sign_in, updates[ 0 ][ 1 ] );
    } )
    
    .fetch( function( fetched ) {
      signin_html( $sign_in, fetched );
    } )
  ;

  var profile = socket_io_server.flow( 'user_profile' );

  profile
    .greedy()
    
    .api
    
    .on( 'add', function( added ) {
      signin_html( $profile, added );
    } )
    
    .on( 'remove', function( removed ) {
      $profile.innerHTML = '';
    } )
    
    .on( 'update', function( updates ) {
      signin_html( $profile, updates[ 0 ][ 1 ] );
    } )
    
    .fetch( function( fetched ) {
      signin_html( $profile, fetched );
    } )
  ;

  // Sign-in menu
  function signin_html( $node, adds ) {
    adds.forEach( function( add ) {
      switch ( add.flow ) {
        case 'providers':
          console.log( 'signin_html(), providers', add );
          
          $node.innerHTML = '<a id="' + add.id + '" '
            +   'class="has-gap" '
            +   'href="' + add.href + '">'
            +  '<i class="mt-' + add.icon + '"></i>'
            +  add.label
            + '</a>'
          ;          
        break;
        
        case 'user_profile':
          $node.innerHTML = 'Welcome back ' + add.name
            + '<br /><a id="logout" href="/passport/logout">Logout</a>'
          ;
        break;
      }
    } );
  } // signin_html()

  exports.profile   = profile.set();
  exports.providers = providers.set();
} ) ( this );
