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
      const rs              = require( 'toubkal' );
      
      // Session options for express-session, http and socket io servers
      const session_options = {
        key: 'rs_sid',
        secret: 'your cookie secret',
        store: express_store
        saveUninitialized: true,
        resave: false
      };
      
      // Initialize an http server on localhost:8080
      const http_servers    = rs
        .set( [ { id: 1, port: 8080 } ] )
        .http_servers()
      ;
      
      const base_route      = '/passport';
      
      // Configure express application
      http_servers
        .express_use_passport( session_options, { base_route } )
      ;
      
      var logout_profile_routes = rs.set( [
        { // Logout url
          id: '/passport/logout',
          
          handler: function( request, response, next ) {
            request.logout();
            
            response.redirect( base_route + '/login' );
          }
        },
        
        { // Authenticated user profile
          id: '/passport/profile',
          
          handler: function( request, response, next ) {
            if( ! request.isAuthenticated() ) return response.redirect( '/passport/login' );
            
            var user = request.user
              , res  = '<p><a href="'  + base_route       + '/logout">logout</a></p>'
                  + '<p><img src="'    + user.photo       + '" /></p>'
                  + '<p>Name: '        + user.name        + '</p>'
                  + '<p>User ID: '     + user.id          + '</p>'
                  + '<p>Provider ID: ' + user.provider_id + '</p>'
            ;
            
            response.end( res );
          }
        }
      ] );
      
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
        
        .passport_profiles( rs.passport_instance() )
        
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
        
        .union( [ logout_profile_routes, login_menu ] )
        
        .express_route()
      ;
      
      // Serve toubkal-socket_io-ui-min.js and to http server with
      // session_options. This is required to allow reactive login
      // and logout without refreshing a single page application
      var clients = http_servers.dispatch( rs.express_application(), function( source, options ) {
        const session_options = this.session_options;
        
        rs
          .toubkal_min( { socket_io: true, ui: true } )
          .serve( source,
            { routes: [ '/lib', '/node_modules' ], session_options }
          )
        ;
        
        // Use session_options to initialize socket_io_clients
        return source
          .socket_io_clients( { session_options } )
        ;
      } );
      
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
'use strict';

var rs       = require( 'toubkal' )
  , RS       = rs.RS
  
  // Allow to use multiple instances of the passport library for mutiple servers and applications
  // Based on undocumented Passport class:
  // https://stackoverflow.com/questions/35392317/how-to-use-two-separate-passport-instances-in-a-single-express-server-file
  , Passport = require( 'passport' ).Passport
  
  , url      = require( 'url' )
  
  , Pipelet  = RS.Pipelet
  , Set      = RS.Set
  , subclass = RS.subclass
  , RS_log   = RS.log
  , log      = RS_log.bind( null, 'passport' )
  
  , extend   = RS.extend
  , extend_2 = extend._2
  
  , uuid_v4  = RS.uuid.v4
  
  , slice    = Array.prototype.slice
  , push     = Array.prototype.push
  
  , passport_instance_s = 'passport_instance'
;

function indent_2( string ) {
  return ( '\n' + string ).split( '\n' ).join( '\n  ' )
} // indent_2()

function pretty( object ) {
  return indent_2( RS_log.pretty( object ) )
} // pretty()

/* ----------------------------------------------------------------------------
   de&&ug()
*/
var de = false, ug = log;

rs
  /* --------------------------------------------------------------------------
      @pipelet passport_instance()
      
      @short Instanciate a passport instance for an application
      
      @emits
      - **id** (integer): 1
      - **instance** (Object): passport library instance
      
      @description
      This is a @@singleton stateful read-only pipelet. There will be a
      maximum of one instance per @@namespace\.
      
      @see_also
      - Pipelet express_use_passport()
      - Pipelet passport_strategies()
      - Pipelet passport_strategies_routes()
  */
  .Singleton( passport_instance_s, function( source, options ) {
    
    const instance = new Passport();
    
    instance.toJSON = () => passport_instance_s;
    
    return source
      
      .namespace()
      
      .set( [ { id: 1, instance } ] )
    ;
  } ) // passport_instance()
  
  /* --------------------------------------------------------------------------
      @pipelet express_use_passport( session_options, options )
      
      @short Initialize express instance with passport instance
      
      @parameters
      - **session_options** (Object) for pipelet express_application()
      - **options** (Object): @class:Pipelet() options, plus:
        - **base_route** (String): passport base express route, default is
          ```"passport" ```
      
      @source pipelet http_servers()
      
      @emits
      - **id** (integer): 1, from source
      - **application** (Object): Express application instance from source
      - **passport** (Object): Passport library instance from
        pipelet passport_instance()
      
      @examples
      Initialize express application then initialize passport express middleware:
      ```javascript
        // Load dependencies
        const rs              = require( 'toubkal' );
        
        // Session options for express-session, http and socket io servers
        const session_options = {
          key: 'rs_sid',
          secret: 'your cookie secret',
          store: express_store
          saveUninitialized: true,
          resave: false
        };
        
        const http_servers = rs
          // Define http(s) endpoints
          .set( [ { id: 1, ip_address: '0.0.0.0', port: 80 } ] )
          
          .http_servers()
          
          // Configure express application with passport
          .express_use_passport( session_options )
          
          .http_listen()
        ;
      ```
      
      @description
      This is a @@singleton stateful. There will be a
      maximum of one instance per @@namespace\.
      
      @see_also
      - Pipelet express_application()
      - Pipelet passport_instance()
      - Pipelet passport_strategies()
      - Pipelet passport_strategies_routes()
      - Pipelet http_servers()
      - Pipelet http_listen()
  */
  .Singleton( 'express_use_passport', function( http_servers, session_options, options ) {
    const base_route = options.base_route || 'passport';
    
    return http_servers
      
      .express_application( session_options, { base_route } )
      
      .join( rs.passport_instance(), [ 'id' ], function( express, passport ) {
        
        const passport_lib_instance = passport.instance;
        
        express.application
          
          .use( passport_lib_instance.initialize() )
          .use( passport_lib_instance.session()    )
          .use( rs.express_route()._router()       )
        ;
        
        return express;
      }, { no_filter: true } )
      
      .greedy()
    ;
  } ) // express_use_passport()
  
  /* --------------------------------------------------------------------------
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
      See [passport documentation for details](http://passportjs.org/guide/).
      
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
  .Singleton( 'passport_strategies_configuration', function( source, callback_base, options ) {
    
    return source
      // read / write the config files
      // ToDo: default configuration should be read from home directory passport.rs.json
      .configuration( options )
      
      // get passport strategies credentials
      .filter( [ { pipelet: 'passport_strategies' } ] )
      
      // Left join with common strategies
      .map( prepare_strategy )
      
      .json_hide()
      
      //.trace( 'strategies' )
    ;
    
    function prepare_strategy( configuration ) {
      var strategy = extend_2( {}, configuration )
        
        , credentials = strategy.credentials
            = extend( {}, configuration.credentials )
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
      Object.defineProperty( credentials, 'toJSON', { value: credentials_toJSON } );
      
      //log( 'passport_strategies_configuration(), strategy:', JSON.stringify( strategy, null, ' ' ) );
      
      return strategy;
      
      function error( message ) {
        log( 'configuration error, ' + message );
      } // error()
      
      function credentials_toJSON() {
        var credentials = {};
        
        for ( var p in this ) {
          if ( p == 'callbackURL' ) {
            credentials[ p ] = this[ p ]
          } else {
            credentials[ p ] = '***';
          }
        }
        
        return credentials;
      } // credentials_toJSON()
    } // prepare_strategy()
  } ) // passport_strategies_configuration()

  /* --------------------------------------------------------------------------
      @pipelet passport_strategies( options )
      
      @short Initialize passport strategies
      
      @parameters
      - options (Object): Set options:
        - name (String): debugging name, can be set only during the first
          invocation of passport_strategies()
        - all other options are ignored
      
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
      Initialize passport strategies from source strategies descriptions
      with credentials. Emits successfuly configured strategies stripped
      of credentials.
      
      This is a @@stateful, @@synchronous, @@greedy @@singleton.
      
      ### Errors
      Errors can occur if strategies are not properly configured in
      strategy configuration or if a required strategy npm module is
      not installed or cannot be found.
      
      If this happens the error is logged and the strategy is ignored.
      To fix the error, edit the configuration file to fix it, when
      saved, the strategy will be processed reactively and if the error
      is fixed and no other error is found, the strategy will be
      initialized and emitted.
      
      Logged error messages should contain enough information to
      understand the cause of the problem.
      
      Possible errors are:
      - Strategy npm module not found, e.g.:
        - ```{ [Error: Cannot find module 'passport-yahoo'] code: 'MODULE_NOT_FOUND' }```,
          strategy: yahoo , npm module: passport-yahoo
      
      - Strategy cannot be initialized, this may be due to missing
      credentials or other attributes, e.g.:
        - Error initializing strategy:
          ```[TypeError: OAuthStrategy requires a consumerKey option]```,
          strategy_name: twitter
      
      ### See also
      - Pipelet passport_instance()
      - Pipelet passport_strategies_configuration()
      - Pipelet passport_strategies_routes()
      - Pipelet express_route()
      - Pipelet union()
      - Pipelet trace()
  */
  .Singleton( 'passport_strategies', function( source, options ) {
    const
      rs = source.namespace(),
      
      passport_strategies = rs.set(),
      
      de = false,
      
      log = RS_log.bind( null, 'passport_strategies(),' ),
      
      ug = log
    ;
    
    return source
      
      .emit_transactions()
      
      .alter( transaction => { transaction[ passport_instance_s ] = 1 } )
      
      .join( rs[ passport_instance_s ](), // from source namespace
        
        // on condition, this is a cartesian product
        [ [ passport_instance_s, 'id' ] ],
        
        ( transaction, passport ) =>
          extend(
            {}, transaction, { [passport_instance_s]: passport.instance }
          )
      )
      
      .fetch( passport_strategies ) // all
      
      .map( function( fetched ) {
        const
          strategies  = fetched.values,
          transaction = extend_2( {}, fetched.source ),
          passport    = transaction[ passport_instance_s ]
        ;
        
        let
          removes     = transaction.removes,
          updates     = transaction.updates,
          adds        = transaction.adds
        ;
        
        adds = adds
          // updates may push adds
          ? adds.slice()
          : []
        ;
        
        transaction.removes = removes && removes
          
          .filter( ( strategy ) => {
            const
              position      = find_strategy( strategy ),
              strategy_name = strategy.name
            ;
            
            de&&ug( "remove:", pretty( { position, strategy } ) );
            
            if ( position != -1 ) {
              // Unuse passport strategy, using undocumented passport.unuse() source code:
              // https://github.com/jaredhanson/passport/blob/master/lib/authenticator.js#L79
              passport.unuse( strategy_name );
              
              return strategy;
            }
          } )
          
          .map( emit_strategy )
        ;
        
        transaction.updates = updates && updates
          
          .filter( ( update ) => {
            const
              remove   = update[ 0 ],
              add      = update[ 1 ],
              position = find_strategy( remove )
            ;
            
            de&&ug( "update:", pretty( { position, update } ) );
            
            if ( position != -1 ) {
              // update existing strategy if updated successfully
              return remove.module == add.module
                || add_strategy( add, -1 )
              ;
            }
            
            // try to add new strategy
            adds.push( add );
          } )
          
          .map( update => update.map( emit_strategy ) )
        ;
        
        // caution: proccess adds after updates because updates may add to adds
        transaction.adds = adds
          
          .filter( add_strategy )
          
          .map( emit_strategy )
        ;
        
        return transaction;
        
        function add_strategy( strategy, i ) {
          de&&ug( "add:", pretty( strategy ) );
          
          const
            strategy_name = strategy.name,
            module        = strategy.module,
            credentials   = strategy.credentials,
            parameters    = [ user_lookup ]
          ;
          
          credentials && parameters.unshift( credentials );
          
          let Strategy, strategy_processor;
          
          try {
            Strategy = require( module )[ strategy.Strategy || 'Strategy' ];
          } catch( e ) {
            // ToDo: emit error
            log( 'Error requiring strategy npm module:', module + ', error:', e );
            
            return; // nothing added
          }
          
          try {
            strategy_processor = subclass.new_apply( Strategy, parameters );
          } catch( e ) {
            // ToDo: emit error
            log( 'Error initializing strategy:', e );
            
            return; // nothing added
          }
          
          if ( i == -1 ) passport.unuse( strategy_name ); // on update, unuse previous strategy
          
          passport.use( strategy_name, strategy_processor );
          
          return true;
          
          function user_lookup( token, token_secret, profile, done ) {
            // ToDo: move into passport_profiles() definition as it adds and updates profiles
            // ToDo: provide an example of the provider profile structure
            var id            = profile.id
              , _query        = [ { provider_name: strategy_name, provider_id: id } ]
              , user_profiles = []
              , users         = passport_profiles
              , name          = 'lookup_and_create(), '
            ;
            
            de&&ug( name + 'provider profile: ' + profile.id + ', strategy_name: ' + strategy_name );
            
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
                
                // ToDo: Fix this hack, this is a transactional update on users profiles
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
          } // user_lookup()
        } // add_strategy()
        
        function find_strategy( strategy ) {
          const id = strategy.id;
          
          return strategies.find( ( strategy ) => s.id === id  );
        } // find_strategy()
        
        function emit_strategy( strategy ) {
          // shallow clone and add passport
          strategy = extend( {}, strategy, { passport } );
          
          // remove credentials()
          let credentials = strategy.credentials;
          
          if ( credentials ) {
            strategy.callback_url = credentials.callbackURL || credentials.returnURL;
            
            delete strategy.credentials;
          }
          
          //de&&ug( 'emit:', pretty( strategy ) );
          
          return strategy;
        } // emit_strategy()
      } )
      
      .emit_operations()
      
      .through( passport_strategies )
    ;
  } ) // passport_strategies()
;

/* -------------------------------------------------------------------------------------------
    @pipelet passport_profiles( passport_instance, options )
    
    @short Performs passport (de)serialization, emits new and updated user profiles.
    
    @parameters
    - passport_instance (Pipelet): from pipelet passport_instance()
    - options (Object): optional Pipelet options
    
    @examples:
    ```javascript
      rs.database()
        
        .flow( 'user_profile' )
        
        .passport_profiles( rs.passport_instance() )
        
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
// ToDo: refactor to use toubkal best practicies  between Passport_Profiles and Passport_Strategies
// ToDo: the above documentation example needs to be updated from actual application uses
// ToDo: make this a source-namespace-scoped singleton, use Singleton composition
var passport_profiles;

function Passport_Profiles( passport_instance, options ) {
  var that = this;
  
  if ( passport_profiles ) return passport_profiles;
  
  passport_profiles = that;
  
  Pipelet.call( that, options );
  
  that._output.source = null;
  
  passport_instance.api.fetch( ( values ) => {
    let passport = values[ 0 ]
      , passport_lib_instance = passport && passport.instance
    ;
    
    if ( passport_lib_instance ) {
      passport_lib_instance.serializeUser( serialize );
      
      passport_lib_instance.deserializeUser( deserialize );
    }
  } );
  
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

rs
  /* --------------------------------------------------------------------------
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
      - Pipelet passport_instance()
      - Pipelet passport_strategies_configuration()
      - Pipelet passport_strategies()
      - Pipelet express_route()
      - Pipelet union()
      - Pipelet trace()
  */
  .Compose( 'passport_strategies_routes', function( source, options ) {
    const
      base_route = options.base_route || '/passport',
      
      de = true
    ;
    
    return source
      
      .flat_map( function( strategy ) {
        const
          strategy_name = strategy.name,
          
          ug = de && RS_log.bind( null,
              'passport_strategies_routes(), strategy:', strategy_name + ','
            )
          ,
          
          out = [ login_route() ]
        ;
        
        callback_route( strategy.callback_url );
        
        // de&&ug( pretty( { strategy, out } ) )
        
        return out;
        
        function authenticate_handler( options ) {
          return strategy.passport.authenticate( strategy_name, options );
        } // authenticate_handler()
        
        function login_route() {
          const
            id = base_route + '/' + strategy_name,
            
            passport_handler = authenticate_handler(
              { scope: strategy.scope, state: strategy.state }
            )
          ;
          
          return { id, handler };
          
          function handler( request, response, next ) {
            // for passport undocumented return to current location,
            // see https://asheythedragon.wordpress.com/2015/03/24/adding-smart-redirects-with-passport/
            // see also related passport issue 120:
            // https://github.com/jaredhanson/passport/issues/120
            request.session.returnTo = request.header( 'Referer' );
            
            passport_handler( request, response, next );
            
            // Show redirection to the authorisation server
            de&&ug( 'login response header:', indent_2( response._header ) )
          } // handler()
        } // login_route()
        
        function callback_route( callback_url ) {
          if ( callback_url ) {
            
            const
              id = url.parse( callback_url ).pathname,
              
              passport_handler = authenticate_handler(
                { successReturnToOrRedirect: '/', failureRedirect: '/' }
              )
            ;
            
            out.push( { id, handler } );
            
            function handler( request, response, next ) {
              // Show authorisation server response with the authorisation code
              de&&ug( 'callback request query:', pretty( request.query ) );
              
              passport_handler( request, response, next );
            } // handler()
          }
        } // callback_route()
      } )
    ;
  } ) // passport_strategies_routes()

  /* --------------------------------------------------------------------------
      @pipelet passport_user_sessions( options )
      
      @short Get authenticated user sessions from session_store().
      
      @parameters
      - **options** (Object): @@class:Pipelet options, plus:
        - **flow** (String): emitted dataflow name, default is "user_sessions"
        - **debug** (Object): pipelet trace() options
      
      @source session store output
      - **id** (String): sessions id
      - **content** (Object):
        - **passport** (Object):
          - **user** (String): user uuid
      
      @emits only if source content.passport.user is truly:
      - **flow** (String): ```options.flow```
      - **id** (String): session id
      - **user_id** (String): user id from source ```content.passport.user```
      
      @examples
      Create application singleton "user_sessions":
      ```javascript
        rs.Singleton( 'user_sessions', function( source, options ) {
          return source
            .namespace()
            .session_store()
            .passport_user_sessions()
          ;
        } )
      ```
      
      @description
      This is a @@stateless, @@synchronous pipelet.
      
      It is @@lazy on queries for session ```id``` or ```user_id```,
      @@greedy otherwise.
      
      ### See Also
      - Pipelet session_store().
  */
  .Compose( 'passport_user_sessions', function( source, options ) {
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
  } ) // passport_user_sessions()
;
