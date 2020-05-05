/*  passport.js
    
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

/* -------------------------------------------------------------------------------------------
    @chapter architect_passport
    
    @title Authentication with Passport Pipelets
    
    @manual architect
    
    @description
    
    Passport is a node / express library that helps authenticate users using a large variety
    of authentication strategies, including username / password, session, and social
    strategies such as Twitter, Facebook, Google, Github and countless others.
    
    Passport Pipelets allow to leverage these, encapsulating all aspects of safe passport
    configuration and making everything reactive.
    
    Usage in a complete server serving a database to authorized socket io client users:
    
    ```javascript
      // Load dependencies
      var rs              = require( 'toubkal' )
        , application     = require( 'express' )()
        , session         = require( 'express-session' )
        , passport        = require( 'passport' )
      ;
      
      // Initialize session store
      var session_store   = rs.session_store() // a session store dataflow
        
        , express_store   = new rs.RS.Express_Session_Store( session_store )
      ;
      
      // Session options for express-session, http and socket io servers
      var session_options = {
        key: 'rs_sid',
        secret: 'your cookie secret',
        store: express_store
        saveUninitialized: true,
        resave: false
      };
      
      // Reactive express router middleware
      var router = rs
        .express_route()
        ._router
      ;
      
      // Configure express application
      application
        .use( session( session_options ) )
        .use( passport.initialize()      )
        .use( passport.session()         )
        .use( router()                   )
        
        // Logout url
        .get( '/passport/logout', function( request, response, next ) {
          var base_route = passport_route;
          
          request.logout();
          
          response.redirect( base_route + '/login' );
        } )
        
        // Authenticated user profile
        .get( '/passport/profile', function( request, response, next ) {
          var base_route = passport_route;
          
          if( ! request.isAuthenticated() ) return response.redirect( '/passport/login' );
          
          var user = request.user
            , res  = '<p><a href="'  + base_route       + '/logout">logout</a></p>'
                + '<p><img src="'    + user.photo       + '" /></p>'
                + '<p>Name: '        + user.name        + '</p>'
                + '<p>User ID: '     + user.id          + '</p>'
                + '<p>Provider ID: ' + user.provider_id + '</p>'
          ;
          
          response.end( res );
        } )
      ;
      
      // Building reactive server-side strategies menu page
      var login_menu = rs
        .passport_strategies()
        
        // Don't emit anything if this is just a credentials change
        .optimize()
        
        // Set order attribute to name if not present
        .alter( function( strategy ) {
          strategy.order = strategy.order || strategy.name
        } )
        
        // All strategies into content attribute
        .group()
        
        // Sort strategies in content by order attribute
        .content_order( 'order' )
        
        // Render html in content attribute from strategies
        .content_transform( function( strategies ) {
          return
            '<html>' +
              '<head>' +
                '<style>li {list-style-type: none;}</style>' +
              '</head>' +
              
              '<body>' +
                '<ul>' +
                  '<li>Login using your account at</li>' +
                  
                  strategies
                    .map( function( strategy ) {
                      var name = strategy.display_name || strategy.name
                        , path = '/passport/' + strategy.name
                      ;
                      
                      return '<li><a href="' + path + '">' + name + '</a></li>'
                    } )
                    
                    .join()
                  
                '</ul>' +
              '<body>' +
            '</html>'
          ;
        } )
        
        .content_route( '/passport/login' )
      ;
      
      // Load database singleton pipelet, content not shown in this example
      require( './database.js' );
      
      // Handle user profiles
      rs.database()
        
        .flow( 'user_profile' )
        
        .passport_profiles()
        
        .map( function( user ) {
           // New user or updated profile from provider profile
           var profile          = user.profile
             , previous_profile = JSON.stringify( user.previous_profile )
             , adds             = []
             , updates          = []
           ;
           
           user = {
             flow         : 'user_profile',           // required for lookups, mandated by flow( 'user_profile' )
             id           : user.id,                  // uuid v4, provided by passport_profiles()
             provider_name: user.provider_name,       // strategy name, required for lookups by passport_profiles()
             provider_id  : user.provider_id,         // provider-specific unique identifier, required for lookups by passport_profiles()
             name         : profile.displayName,
             emails       : profile.emails,
             photo        : profile.photos[ 0 ].value
             profile      : JSON.stringify( profile ) // required for comparisons with new profiles
           };
           
           if( previous_profile ) {
             if( previous_profile != user.profile ) {
               updates.push( [ extend( {}, user, { profile: previous_profile } ), user ] );
             }
           } else {
             adds.push( user );
           }
           
           return { updates: updates, adds: adds };
        } )
        
        .emit_operations()
        
        .trace( 'new user profiles' )
        
        .database()
      ;
      
      // Process strategies from configuration to express routes
      rs
        .passport_strategies_configuration( '/passport' )
        
        .trace( 'configured strategies' )
        
        .passport_strategies()
        
        .trace( 'initialized strategies' )
        
        .passport_strategies_routes()
        
        .union( [ login_menu ] )
        
        .express_route()
      ;
      
      // Initialize an http server on localhost:8080
      var http_servers = rs
        .set( [ { id: 1, port: 8080 } ] )
        .http_servers()
      ;
      
      // Mount passport express application on http server at /passport
      http_servers
        .serve_http_servers( express_handler, { routes: '/passport' } )
      ;
      
      // Not providing next() allow express to handle errors
      function express_handler( request, response ) {
        application( request, response )
      }
      
      // Serve toubkal-socket_io-ui-min.js and to http server with
      // session_options. This is required to allow reactive login
      // and logout without refreshing a single page application
      require( 'toubkal' )
        .toubkal_min( { socket_io: true, ui: true } )
        .serve( http_servers,
          { routes: [ '/lib', '/node_modules' ], session_options: session_options }
        )
      ;
      
      // Use session_options to initialize socket_io_clients
      var clients = http_servers
        .socket_io_clients( { session_options: session_options } )
      ;
      
      // Get passport authenticated users dataflow from session store:
      var user_sessions = session_store
        .passport_user_sessions()
      ;
      
      // Serve database and user_sessions socket io clients
      rs
        .database()
        .union( [ user_sessions ] )
        .dispatch( clients, client )
        .database()
      ;
      
      // Socket io client code with authorizations
      function client( source, options ) {
        var rs        = source.namespace()
          , socket    = this.socket
          , handshake = socket.socket.handshake
          , sid       = handshake.sessionID
        ;
        
        // Authenticated user dataflow
        var authenticated_user = source
          .filter( [ { flow: 'user_sessions', id: sid } ] )
        ;
        
        // Reactive Authorization filters
        var user_profile = authenticated_user.set_flow( 'user_profile' );
        
        // Read Authorizations
        var can_read = rs.union( [
          user_profile
          // more database read authorizations here
        ] );
        
        // Write authorizations
        var can_write = rs.union( [
          user_profile
          // more database write authorizations here
        ] );
        
        // Authorized source to client
        source
          .filter( can_read )
          ._add_destination( socket )
        ;
        
        return socket
          .filter( can_write )
        ;
      } // client()
    ```
*/
// ToDo: review passport architect manual
'use strict';

var passport = require( 'passport' )
  , url      = require( 'url' )
  
  , rs       = require( 'toubkal' )
  , RS       = rs.RS
  , Pipelet  = RS.Pipelet
  , Set      = RS.Set
  , subclass = RS.subclass
  , log      = RS.log.bind( null, 'passport' )
  
  , extend   = RS.extend
  , extend_2 = extend._2
  
  , uuid_v4  = RS.uuid.v4
  
  , slice    = Array.prototype.slice
  , push     = Array.prototype.push
;

/* ----------------------------------------------------------------------------
   de&&ug()
*/
var de = false, ug = log;

/* ----------------------------------------------------------------------------
    @pipelet passport_strategies_configuration( callback_base, options )
    
    @short Reads configuration then prepare it for downstream
    
    @parameters:
    - **callback_base** (String): Default callback base url after
    authentification
    - **options** (Object): for pipelet configuration()
      - **filepath** (String): configuration file path, defaults to
      ```~/config.rs.json```
      - **base_directory** (String): if filepath is not an absolute
      directory
    
    @examples:
    - Strategy definitions from configiguration file:
      ```javascript
        {
          "id": "passport_strategies#facebook",
          "pipelet": "passport_strategies",
          "module": "passport-facebook",
          "name": "facebook",
          
          "credentials": {
              "clientID"    : "***************"
            , "clientSecret": "********************************"
          }
        }
      ```
    
    - Process passport strategies from configuration to express routes:
      ```javascript
        rs
          .passport_strategies_configuration( '/passport' )
          
          .trace( 'configured strategies' )
          
          .passport_strategies()
          
          .trace( 'initialized strategies' )
          
          .passport_strategies_routes()
          
          .union( [ login_menu ] )
          
          .express_route()
        ;
      ```
    
    @description:
    See passport documentation for more details: http://passportjs.org/guide/
    
    Configuration attributes should be set as follows:
    - **id** (String): A unique identifier, starting with mandatory
    ```"passport_strategies#"``` and ending with strategy name.
    
    - **pipelet** (String): Must be ```"passport_strategies"```.
    
    - **name** (String): the strategy name, necessary for passport
    authentication routes processing, default is extracted from id,
    after the '#'.
    
    - **module** (String): npm module for passport strategy, default
    is ```'passport-' + name```.
    
    - **scope** (Strings Array): optional scope strings, check
    strategy documentation for details
    
    - **credentials**  (Object): strategy-specific credentials:
      - required credential attributes per specific strategy documentation
      - **callbackURL** (String): optional, defaults to
      ```callback_base + '/' + name + '/callback'```
    
    ### See also
    - Pipelet passport_strategies()
    - Pipelet passport_strategies_routes()
    - Pipelet express_route()
    - Pipelet union()
    - Pipelet trace()
*/
rs.Singleton( 'passport_strategies_configuration', function( source, callback_base, options ) {
  return source
    // read / write the config files
    // ToDo: default configuration should be read from home directory passport.rs.json
    .configuration( options )
    
    // get passport strategies credentials
    .filter( [ { pipelet: 'passport_strategies' } ] )
    
    // Left join with common strategies
    .map( prepare_strategy )
    
    //.trace( 'strategies' )
  ;
  
  function prepare_strategy( configuration ) {
    var strategy = extend( { lookup_user: lookup_user }, configuration )
      , credentials = strategy.credentials = extend( {}, configuration.credentials );
    ;
    
    if ( ! strategy.name ) {
      var id = strategy.id
        , pound = id.indexOf( '#' )
      ;
      
      if ( pound == -1 ) {
        error( 'no pound (#) found in id: ' + id );
        
        return null;
      }
      
      strategy.name = id.slice( id.indexOf( '#' ) + 1 );
      
      if ( ! strategy.name.length ) {
        error( 'no strategy name found in id: ' + id );
        
        return null;
      }
    }
    
    if ( ! strategy.module ) {
      strategy.module = 'passport-' + strategy.name;
    }
    
    if ( ! credentials.callbackURL ) {
      credentials.callbackURL = callback_base + '/' + strategy.name + '/callback';
    }
    
    // Prevent credentials from being accidentally traced with JSON.stringify()
    credentials.toJSON || Object.defineProperty( credentials, 'toJSON', { value: credentials_toJSON } );
    
    return strategy;
    
    function lookup_user( lookup_and_create, token, token_secret, profile, done ) {
      lookup_and_create( profile, done );
    } // lookup_user()
    
    function credentials_toJSON() {
      var o = {};
      
      for ( var p in credentials ) {
        if ( p == 'callbackURL' ) {
          o[ p ] = credentials[ p ]
        } else {
          o[ p ] = '***';
        }
      }
      
      return o;
    } // credentials_toJSON()
    
    function error( message ) {
      log( 'configuration error, ' + message );
    } // error()
  } // prepare_strategy()
} ); // passport_strategies_configuration()

/* -------------------------------------------------------------------------------------------
    @pipelet passport_strategies( options )
    
    @short Initialize passport strategies
    
    @parameters:
    - options (Object): Set options:
      - name (String): debugging name, can be set only during the first invocation of
        passport_strategies()
      - all other options are ignored
    
    @examples:
    - Process passport strategies from configuration to express routes:
      ```javascript
        rs
          .passport_strategies_configuration( '/passport' )
          
          .trace( 'configured strategies' )
          
          .passport_strategies()
          
          .trace( 'initialized strategies' )
          
          .passport_strategies_routes()
          
          .union( [ login_menu ] )
          
          .express_route()
        ;
      ```
    
    @description:
    Initialize passport strategies from source strategies descriptions with credentials and
    lookup_user() function. Emits successfuly configured strategies stripped of credentials
    and lookup_user() function.
    
    This is a @@stateful, @@synchronous, @@greedy @@singleton.
    
    ### Errors
    Errors can occur if strategies are not properly configured in strategy configuration
    file or if a required strategy npm module is not installed or cannot be found.
    
    If this happens the error is logged and the strategy is ignored. To fix the error, edit
    the configuration file to fix it, when saved, the strategy will be processed again in
    reactively and if the error is fixed and no other error is found, the strategy is
    initialized and emitted.
    
    Logged error message should contain enough information to understand the cause of the
    problem.
    
    Possible errors are:
    - Strategy npm module not found, e.g.:
      - { [Error: Cannot find module 'passport-yahoo'] code: 'MODULE_NOT_FOUND' } , strategy: yahoo , npm module: passport-yahoo
    
    - Stratefy cannot be initialized, this may be due to missing credentials or other
    attributes, e.g.:
      - Error initializing strategy: [TypeError: OAuthStrategy requires a consumerKey option] , strategy_name: twitter
    
    Eventually errors will be emitted in an error datatlow enabling more error reporting and
    recovery options.
    
    ### See also
    - Pipelet passport_strategies_configuration()
    - Pipelet passport_strategies_routes()
    - Pipelet express_route()
    - Pipelet union()
    - Pipelet trace()
*/
function Passport_Strategies( options ) {
  Set.call( this, [], { name: options.name } );
} // Passport_Strategies()

Set.Build( 'passport_strategies', Passport_Strategies, function ( Super ) {
  function get_emitted_strategy( strategy ) {
    strategy = extend_2( {}, strategy );
    
    var credentials = strategy.credentials;
    
    if ( credentials ) {
      strategy.callback_url = credentials.callbackURL || credentials.returnURL;
      
      delete strategy.credentials;
    }
    
    delete strategy.lookup_user;
    
    return strategy;
  } // get_emitted_strategy()
  
  return {
    _add_value: function( t, strategy ) {
      var that = this
        , name
        , Strategy
      ;
      
      de&&ug( get_name() + ', strategy name:', strategy.name );
      
      try {
        Strategy = require( strategy.module )[ strategy.Strategy || 'Strategy' ];
      } catch( e ) {
        // ToDo: emit error
        log( get_name() + 'Error:', e, ', strategy:', strategy.name, ', npm module:', strategy.module );
        
        t.emit_nothing();
        
        return;
      }
      
      var parameters     = [ user_lookup ]
        , credentials    = strategy.credentials
        , strategy_name  = strategy.name
      ;
      
      credentials && parameters.unshift( credentials );
      
      try {
        var strategy_processor = subclass.new_apply( Strategy, parameters );
      } catch( e ) {
        log( get_name() + 'Error initializing strategy:', e, ', strategy_name:', strategy_name );
        
        t.emit_nothing();
        
        return;
      }
      
      passport.use( strategy_name, strategy_processor );
      
      Super._add_value.call( this, t, get_emitted_strategy( strategy ) );
      
      function user_lookup() {
        var args = slice.call( arguments, 0 );
        
        args.unshift( user_lookup_and_create.call( that, strategy.name ) );
        
        strategy.lookup_user.apply( strategy, args );
      } // user_lookup()
      
      // ToDo: move user_lookup_and_create() into passport_profiles() definition as it adds and updates profiles
      function user_lookup_and_create( strategy_name ) {
        var users = passport_profiles
          , name  = this._get_name( 'lookup_and_create' )
        ;
        
        return function lookup_and_create( profile, done ) {
          // ToDo: provide an example of the provider profile structure
          de&&ug( name + 'provider profile: ' + profile.id + ', strategy_name: ' + strategy_name );
          
          var id       = profile.id
            , _query   = [ { provider_name: strategy_name, provider_id: id } ]
            , user_profiles = []
          ;
          
          // fetch user profiles
          users._input._fetch( fetched, _query );
          
          function fetched( profiles, no_more ) {
            push.apply( user_profiles, profiles );
            
            if ( ! no_more ) return;
            
            var l = user_profiles.length, user;
            
            delete profile._raw;
            
            if ( l == 0 ) {
              user = {
                id           : uuid_v4(),
                provider_name: strategy_name,
                provider_id  : id,
                profile      : profile
              };
              
              // no user profile matched, create a new user profile
              de&&ug( name + 'new user:', user.id );
              
              users.__emit_add( [ user ] );
            } else if ( l == 1 ) {
              // user found
              user = user_profiles[ 0 ];
              
              de&&ug( name + 'found user:', user );
              
              var previous_profile = user.profile; // JSON string
              
              if( previous_profile ) {
                try {
                  previous_profile = JSON.parse( previous_profile );
                } catch( e ) {
                  previous_profile = null;
                }
              }
              
              // Ignore undefined values in profile
              profile = JSON.parse( JSON.stringify( profile ) );
              
              // emit add with new and previous profile
              user = extend( {}, user, { profile: profile, previous_profile: previous_profile } );
              
              users.__emit_add( [ user ] );
            } else {
              return done( new Error(
                  'Mulitple (' + l
                + ') user profiles found for id: ' + id
                + ', provider: ' + strategy_name
              ) );
            }
            
            return done( null, user );
          } // fetched()
        } // lookup_and_create()
      } // user_lookup_and_create()
      
      function get_name() {
        return name = name || that._get_name( '_add_value' );
      }
    }, // _add_value()
    
    _remove_value: function( t, strategy ) {
      var position      = this._a_index_of( strategy )
        , strategy_name = strategy.name
      ;
      
      de&&ug( this._get_name( '_remove_value' ), { strategy_name: strategy_name, position: position } );
      
      if ( position != -1 ) {
        // Unuse passport strategy, using undocumented passport.unuse() source code:
        // https://github.com/jaredhanson/passport/blob/master/lib/authenticator.js#L79
        passport.unuse( strategy_name );
        
        Super._remove_value.call( this, t, get_emitted_strategy( strategy ) );
      } else {
        t.emit_nothing();
      }
    } // _remove_value()
  }; // passport_strategies() prototype
} )

.singleton(); // passport_strategies()

/* -------------------------------------------------------------------------------------------
    @pipelet passport_profiles( options )
    
    @short Performs passport (de)serialization, emits new and updated user profiles.
    
    @parameters
    - options (Object): optional Pipelet options
    
    @examples:
    ```javascript
      rs.database()
        
        .flow( 'user_profile' )
        
        .passport_profiles()
        
        .map( function( user ) {
           // New user or updated profile from provider profile
           var profile          = user.profile
             , previous_profile = JSON.stringify( user.previous_profile )
             , adds             = []
             , updates          = []
           ;
           
           user = {
             flow         : 'user_profile',           // required for lookups, mandated by flow( 'user_profile' )
             id           : user.id,                  // uuid v4, provided by passport_profiles()
             provider_name: user.provider_name,       // strategy name, required for lookups by passport_profiles()
             provider_id  : user.provider_id,         // provider-specific unique identifier, required for lookups by passport_profiles()
             name         : profile.displayName,
             emails       : profile.emails,
             photo        : profile.photos[ 0 ].value
             profile      : JSON.stringify( profile ) // required for comparisons with new profiles
           };
           
           if( previous_profile ) {
             if( previous_profile != user.profile ) {
               updates.push( [ extend( {}, user, { profile: previous_profile } ), user ] );
             }
           } else {
             adds.push( user );
           }
           
           return { updates: updates, adds: adds };
        } )
        
        .emit_operations()
        
        .database()
      ;
    ```
    
    @description
    This is a @@singelton, the first instance is always returned. Parameters are only
    interpreted on the first instanciation, ignored for all other instanciations.
    
    ### See Also
    - Pipelet flow()
    - Pipelet map()
    - Pipelet emit_operations()
*/
// ToDo: the above documentation example needs to be updated from actual application uses
// ToDo: make this a source-namespace-scoped singleton, use Singleton composition
var passport_profiles;

function Passport_Profiles( options ) {
  var that = this;
  
  if ( passport_profiles ) return passport_profiles;
  
  passport_profiles = that;
  
  Pipelet.call( that, options );
  
  that._output.source = null;
  
  passport.serializeUser( serialize );
  
  passport.deserializeUser( deserialize );
  
  function serialize( user, done ) {
    var id = user.id;
    
    de&&ug( 'serializeUser(), user:', id );
    
    done( null, id );
  } // serialize()
  
  function deserialize( user_id, done ) {
    var user_profiles = [];
    
    de&&ug( 'deserializeUser(), user_id:', user_id )
    
    // should fetch all source namespace sources
    that._input._fetch( rx, [ { id: user_id } ] );
    
    function rx( profiles, no_more ) {
      push.apply( user_profiles, profiles );
      
      if ( no_more ) {
        de&&ug( 'deserializeUser(), user_id: ' + user_id + ', user profiles:', user_profiles );
        
        if ( user_profiles.length > 1 )
          return error( 'multiple profiles found:' + user_profiles.length );
        
        var user = user_profiles[ 0 ];
        
        if ( ! user )
          return error( 'not found' );
        
        return done( null, user );
      }
      
      function error( message ) {
        done( new Error( 'deserializeUser(), user id: ' + user_id + ', ' + message ) );
      }
    } // rx()
  } // deserialize()
} // Passport_Profiles()

Pipelet.Build( 'passport_profiles', Passport_Profiles );

/* ----------------------------------------------------------------------------
    @pipelet passport_strategies_routes( options )
    
    @short Emit passport strategy routes for @@pipelet:express_route()
    
    @parameters
    - **options** (optional Object):
      - **base_route** (String): default is "/passport"
    
    @emits
    - **id** (String): route path for @@pipelet:express_route()
    - **handler** (Function): express handler
    
    @examples
    - Process passport strategies from configuration to express routes:
      ```javascript
        rs
          .passport_strategies_configuration( '/passport' )
          
          .trace( 'configured strategies' )
          
          .passport_strategies()
          
          .trace( 'initialized strategies' )
          
          .passport_strategies_routes()
          
          .union( [ login_menu ] )
          
          .express_route()
        ;
      ```
    
    @description
    This is a @@stateless, @@synchronous, @@lazy pipelet.
    
    For each source strategy, emits up to two routes:
    - a login route: ```base_route + '/' + strategy_name```
    - an optional callback route if strategy has a ```callback_url```
    
    ### See also
    - Pipelet passport_strategies_configuration()
    - Pipelet passport_strategies()
    - Pipelet express_route()
    - Pipelet union()
    - Pipelet trace()
*/
// ToDo: use flat_map(), make it greedy
function Passport_Strategies_Routes( options ) {
  var that = this;
  
  Pipelet.call( that, options );
  
  that._output._transform = that.__transform.bind( that );
  
  that._options.base_route = that._options.base_route || '/passport';
} // Passport_Strategies_Routes()

Pipelet.Build( 'passport_strategies_routes', Passport_Strategies_Routes, {
  __transform: function( values ) {
    var that       = this
      , base_route = that._options.base_route
      , out        = []
    ;
    
    values.forEach( function( strategy ) {
      var strategy_name          = strategy.name
        , callback_url           = strategy.callback_url
        
        , passport_login_handler = passport.authenticate( strategy_name, {
            scope: strategy.scope,
            state: strategy.state // auto-handle state param from Linkedin strategy preventing CSRF attacks
          } )
      ;
      
      // for passport undocumented return to current location,
      // see https://asheythedragon.wordpress.com/2015/03/24/adding-smart-redirects-with-passport/
      // see also related passport issue 120:
      // https://github.com/jaredhanson/passport/issues/120
      
      // create login route
      out.push( { id: base_route + '/' + strategy_name, handler: login_handler } );
      
      if ( callback_url ) {
        // create callback route
        out.push( {
          id: url.parse( callback_url ).pathname,
          
          handler: passport.authenticate(
            strategy_name,
            
            { successReturnToOrRedirect: '/', failureRedirect: '/' }
          )
        } );
      }
      
      function login_handler( request, response, next ) {
        request.session.returnTo = request.header( 'Referer' );
        
        passport_login_handler( request, response, next );
      } // login_handler()
    } );
    
    return out;
  } // __transform()
} ); // passport_strategies_routes()

/* -------------------------------------------------------------------------------------------
    @pipelet passport_user_sessions( options )
    
    @short Get authenticated user sessions from session_store().
    
    @parameters
    - **options** (Object): @@class:Pipelet options, plus:
      - **debug** (Object): pipelet trace() options
    
    @source session store output
    - **id** (String): sessions id
    - **content** (Object):
      - **passport** (Object):
        - **user** (String): user uuid
    
    @emits only if source content.passport.user is truly:
    - **id** (String): sessions id
    - **user_id** (String): user id from source content.passport.user
    
    @examples
    ```javascript
      var user_sessions = rs
        .session_store()
        .passport_user_sessions()
      ;
    ```
    
    @description
    This is a @@stateless, @@synchronous pipelet.
    
    It is @@lazy on queries for session ```id``` or ```user_id```,
    @@greedy otherwise.
    
    ### See Also
    - Pipelet session_store().
*/
rs.Compose( 'passport_user_sessions', function( source, options ) {
  var debug = options.debug; // || { with_queries: true };
  
  return source
    
    .debug( debug, 'passport_user_sessions', debug )
    
    .map( get_user_id, { query_transform: query_transform } )
    
    .set_flow( options.flow || 'user_sessions' )
  ;
  
  function get_user_id( session ) {
    // ToDo: use undocumented passport internals to get logged-in user id
    var passport = session.content.passport
      , user_id = passport && passport.user
    ;
    
    return user_id
      && { id: session.id, user_id: user_id }
    ;
  } // get_user_id()
  
  function query_transform( term ) {
    var id      = term.id
      , user_id = term.user_id
    ;
    
    term = {}; // will be greedy if both id and user_id are not present
    
    if ( id ) term.id = id;
    
    if ( user_id ) term.content = { passport: { user: user_id } };
    
    return term;
  } // query_transform()
} ); // passport_user_sessions()

// passport.js
