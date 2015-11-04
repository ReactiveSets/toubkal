/*  passport.js
    
    ----
    
    Copyright (C) 2013, 2015, Reactive Sets

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
   Passport is a node / express library that helps authenticate users using a large variety
   of authentication strategies, including username / password, session, and social
   strategies such as Twitter, Facebook, Google, Github and countless others.
   
   Passport Pipelets allow leverage these, encapsulating all aspects of safe passport
   configuration and making everything reactive. Strategies can be added, removed or
   updated reactively.
   
   Typical Usage:
     // Configure express application
     var application     = require( 'express' )()
       , body_parser     = require( 'body-parser' )
       , session         = require( 'express-session' )
       , passport        = require( 'passport' )
       
       , session_options = {
           key: 'rs_sid', // session cookie name
           secret: 'your cookie secret', // ToDo: get express-session secret from configuration
           store: new session.MemoryStore(),
           saveUninitialized: true,
           resave: false
         }
     ;
     
     application
       .use( body_parser()              )
       .use( session( session_options ) )
       .use( passport.initialize()      )
       .use( passport.session()         )
     ;
     
     // Handle user profiles
     rs.database()
       
       .flow( 'user_profile' )
       
       .passport_profiles()
       
       .alter( function( user ) {
         // New user profile from passport_profiles()
         var _ = user.profile;
         
         var profile = {
           flow         : 'user_profile',
           id           : user.id,
           provider_name: user.provider_name,
           provider_id  : user.provider_id,
           name         : _.displayName,
           emails       : _.emails,
           photo        : _.photos[ 0 ].value
         };
         
         return profile;
       }, { no_clone: true } )
       
       .trace( 'new user profiles' )
       
       .database()
     ;
     
     rs.passport_strategies_configuration( 'http://example.com/passport' )
       
       .trace( 'configured strategies' )
       
       .passport_strategies()
       
       .trace( 'initialized strategies' )
       
       .passport_routes( application, { base_route: '/passport' } )
     ;
*/
'use strict';

var passport = require( 'passport' )
  , url      = require( 'url' )
  
  , rs       = require( '../core/join.js' )
  , RS       = rs.RS
  , Pipelet  = RS.Pipelet
  , Compose  = Pipelet.Compose
  , Set      = RS.Set
  , subclass = RS.subclass
  , log      = RS.log.bind( null, 'passport' )
  
  , extend   = RS.extend
  , extend_2 = extend._2
  
  , uuid_v4  = RS.uuid.v4
  
  , slice    = Array.prototype.slice
  , push     = Array.prototype.push
;

/* -------------------------------------------------------------------------------------------
   de&&ug()
*/
var de = true, ug = log;

/* -------------------------------------------------------------------------------------------
   Common Strategies
   
   A list of the common passport authentication strategies to join with configuration.
   
   Each object of the set should contain attributes :
   - id (String): unique identifier, must match that of configuration file, composed of the
                  prefix "passport_strategies#" followed by the strategy "name" attribute
                  in configuration.
                  
   - lookup_user (Function): the strategy verify function. It calls a function, passed as parameter,
     with the provider profile and done()
*/
var common_strategies = rs
  .set( [
    
    // TWitter Strategy
    { id  : 'passport_strategies#twitter',
      lookup_user: function( lookup_and_create, token, token_secret, profile, done ) {
        lookup_and_create( profile, done );
      }
    },
    
    // Facebook Strategy
    { id  : 'passport_strategies#facebook',
      lookup_user: function( lookup_and_create, access_token, refresh_token, profile, done ) {
        lookup_and_create( profile, done );
      }
    },
    
    // Google Oauth Strategy
    { id  : 'passport_strategies#google-oauth',
      Strategy   : 'OAuth2Strategy',
      lookup_user: function( lookup_and_create, access_token, refresh_token, profile, done ) {
        lookup_and_create( profile, done );
      }
    },
    
    // GitHub Strategy
    { id  : 'passport_strategies#github',
      lookup_user: function( lookup_and_create, access_token, refresh_token, profile, done ) {
        lookup_and_create( profile, done );
      }
    }
  ] )
;

/* -------------------------------------------------------------------------------------------
   rs.passport_strategies_configuration( callback_base, options )
   
   Reads configuration then joins passport_strategies with common strategies.
   
   Parameters:
   - callback_base    (String): Default callback base url after authentification
   - options (optional Object):
     - filepath       (String): configuration file path, defaults to ~/config.rs.json
     - base_directory (String): if filepath is not an absolute directory
   
   Example of strategy definition from the configiguration file:
   
      {
        "id": "passport_strategies#facebook",
        "pipelet": "passport_strategies",
        "module": "passport-facebook",
        "name": "facebook",
        
        "credentials": {
            "clientID"    : "***************"
          , "clientSecret": "********************************"
          , "callbackURL" : "http://example.com/passport/facebook/callback",
        }
      }
   
   See passport documentation for more details: http://passportjs.org/guide/
   
   Where attributes should be set as follows:
   - id           (String): A unique identifier, starting with mandatory "passport_strategies#"
                            and ending with strategy name.
   
   - pipelet      (String): Must be "passport_strategies".
   
   - name         (String): the strategy name, necessary for passport authentication routes
                            processing, default is extracted from id, after the '#'.
   
   - module       (String): npm module for passport strategy, default is 'passport-' + name.
   
   - scope (Strings Array): optional scope strings, check strategy documentation for details
   
   - credentials  (Object): strategy-specific credentials:
     - required credential attributes per specific strategy documentation
     - callbackURL (optional String): defaults to callback_base + '/' + name + '/callback'
*/
Compose( 'passport_strategies_configuration', function( source, callback_base, options ) {
  return source
    // read the config files
    .configuration( options )
    
    // get passport strategies credentials
    .filter( [ { pipelet: 'passport_strategies' } ] )
    
    // Left join with common strategies
    .join( common_strategies, [ 'id' ], merge_strategy, { left: true } )
    
    //.trace( 'strategies' )
  ;
  
  function merge_strategy( configuration, common ) {
    var strategy = extend( {}, common, configuration )
      , credentials = strategy.credentials = extend( {}, common && common.credentials, configuration.credentials );
    ;
    
    if ( ! strategy.lookup_user ) {
      strategy.lookup_user = function( lookup_and_create, token, token_secret, profile, done ) {
        lookup_and_create( profile, done );
      }
    }
    
    if ( ! strategy.name ) {
      var id = strategy.id
        , pound = id.indexOf( '#' )
      ;
      
      if ( pound == -1 ) {
        error( 'no pound (#) found in id: ' + id );
        
        return null;
      }
      
      strategy.name = id.substr( id.indexOf( '#' ) + 1 );
      
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
  } // merge_strategy()
} ); // passport_strategies_configuration()

/* -------------------------------------------------------------------------------------------
   passport_strategies( options )
   
   Initialize passport strategies from source strategies descriptions with credentials and
   lookup_user() function. Emits successfuly configured strategies stripped of credentials
   and lookup_user() function.
   
   This is a singleton stateful synchronous greedy pipelet.
   
   This singleton can only have one source, i.e. it can be connected upstream only once,
   typically passport_strategies_configuration(). The source of passport_strategies() can be
   defined at any time, not necessarily on first invocation. This singleton can have as many
   destinations as required.
   
   Parameters:
   - options (Object): Set options:
     - name (String): debugging name, can be changed on each invocation of passport_strategies()
     - all other options are ignored
   
   Errors:
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
*/
var strategies_singleton;

function Passport_Strategies( options ) {
  var name = options.name;
  
  if ( strategies_singleton ) {
    // allow to change name option
    if ( name ) strategies_singleton._options.name = name;
    
    return strategies_singleton;
  }
  
  strategies_singleton = this;
  
  Set.call( this, [], { name: name } );
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
      
      var Strategy_apply = subclass.make_constructor_apply( Strategy )
        , parameters     = [ user_lookup ]
        , credentials    = strategy.credentials
        , strategy_name  = strategy.name
      ;
      
      credentials && parameters.unshift( credentials );
      
      try {
        var strategy_processor = new Strategy_apply( parameters );
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
      
      function user_lookup_and_create( strategy_name ) {
        var users = passport_profiles
          , name  = this._get_name( 'lookup_and_create' )
        ;
        
        return function lookup_and_create( profile, done ) {
          // ToDo: provide an example of the provider profile structure
          de&&ug( name + 'provider profile: ' + profile.id + ', strategy_name: ' + strategy_name );
          
          var id       = profile.id
            , _query   = [ { provider_name: strategy_name, provider_id : id } ]
            , user_profiles = []
          ;
          
          // fetch user profiles
          users._input.fetch_source( fetched, _query );
          
          function fetched( profiles, no_more ) {
            push.apply( user_profiles, profiles );
            
            if ( ! no_more ) return;
            
            var l = user_profiles.length, user;
            
            if ( l == 0 ) {
              // no user profile matched, create a new user profile
              user = {
                id           : uuid_v4(),
                provider_name: strategy_name,
                provider_id  : id,
                profile      : profile
              };
              
              de&&ug( name + 'new user:', user.id );
              
              users.__emit_add( [ user ] );
            } else if ( l == 1 ) {
              // user found
              user = user_profiles[ 0 ];
              
              de&&ug( name + 'found user:', user );
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
} ); // passport_strategies()

/* -------------------------------------------------------------------------------------------
   passport_profiles( options )
   
   Performs passport (de)serialization, emits new user profiles.
   
   This is a singelton, the first instance is always returned. Parameters are only
   interpreted on the first instanciation, ignored for all other instanciations.
   
   Parameters:
   - options (optional Object): Pipelet options
   
   Example:
     rs.database()
       
       .flow( 'user_profile' )
       
       .passport_profiles()
       
       .alter( function( user ) {
          // New user profile from provider profile
          var _ = user.profile;
          
          return = {
            flow         : 'user_profile',
            id           : user.id,
            provider_name: user.provider_name,
            provider_id  : user.provider_id,
            name         : _.displayName,
            emails       : _.emails,
            photo        : _.photos[ 0 ].value
          };
        }, { no_clone: true } )

         
       } )
       
       .database()
     ;
*/
var passport_profiles;

function Passport_Profiles( options ) {
  if ( passport_profiles ) return passport_profiles;
  
  passport_profiles = this;
  
  this._input  || ( this._input  = new Passport_Profiles.Input ( this, options.name, options.tag ) );
  this._output || ( this._output = new Passport_Profiles.Output( this, options.name ) );
  
  Pipelet.call( this, options );
  
  var that = this;
  
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
    
    that._input.fetch_source( rx, [ { id: user_id } ] );
    
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

function nil() { return this }

Passport_Profiles.Input = Pipelet.Input.subclass(
  'Passport_Profiles.Input',
  
  function( p, name, tag ) {
    Pipelet.Input.call( this, p, name, tag );
    
    // Allow fetching of anything from source (greedy fetching)
    this.query = RS.Query.pass_all;
  },
  
  {
    // Ignore inputs, we will only fetch from source
    add: nil,
    remove: nil,
    update: nil,
    clear: nil
  }
);

Passport_Profiles.Output = Pipelet.Output.subclass(
  'Passport_Profiles.Output',
  
  function( p, name ) {
    Pipelet.Output.call( this, p, name );
  },
  
  {
    // This source cannot be fetched
    // This output does not reference any state, one can only be notfied of new users login-in
    // Prevent _fetch() from fetching this pipelet's source
    _fetch: function( receiver, query ) {
      receiver( [], true );
    }, // _fetch()
    
    // Disable upstream query updates
    update_upstream_query: nil
  }
);

Pipelet.Build( 'passport_profiles', Passport_Profiles );

/* -------------------------------------------------------------------------------------------
   passport_strategies_routes( options )
   
   Emit passport routes for input strategies.
   
   Parameters:
   - options (optional Object):
     - base_route (String): default is "/passport"
*/
function Passport_Strategies_Routes( options ) {
  Pipelet.call( this, options );
  
  this._options.base_route = this._options.base_route || '/passport';
} // Passport_Strategies_Routes()

Pipelet.Build( 'passport_strategies_routes', Passport_Strategies_Routes, {
  _get_callback_url: function( strategy ) {
    var callback_url = strategy.callback_url;
    
    return callback_url ? url.parse( callback_url ).pathname : null;
  }, // _get_callback_url()
  
  __transform: function( values ) {
    var that       = this
      , base_route = that._options.base_route
      , out        = []
    ;
    
    values.forEach( function( strategy ) {
      var strategy_name   = strategy.name
        , strategy_route  = base_route + '/' + strategy_name
        , scope           = strategy.scope
        , options         = {} // passport authentication options
        , callback_url    = that._get_callback_url( strategy );
      ;
      
      if ( scope ) options.scope = scope;
      
      out.push( { id: strategy_route, handler: passport.authenticate( strategy_name, options ) } );
      
      if ( callback_url ) {
        // ToDo: redirects needs to become options, or parameters allowing success to redirect to route prior to login
        options = { successRedirect: base_route + '/profile', failureRedirect: base_route + '/login' };
        
        out.push( { id: callback_url, handler: passport.authenticate( strategy_name, options ) } );
      }
    } );
    
    return out;
  } // __transform()
} ); // passport_strategies_routes()

/* -------------------------------------------------------------------------------------------
   Building a server-side strategies menu page:
   
     rs
       .passport_strategies()
       
       // Don't do anything if this is just a credentials change
       .operations_optimizer()
       
       // Set order attribute to name if not present
       .alter( function( strategy ) { strategy.order = strategy.order || strategy.name } )
       
       // All strategies into content attribute
       .values_to_attribute()
       
       // Sort strategies in content by order attribute
       .content_order( 'order' )
       
       // Render html in content attribute from strategies
       .content_alter( function( strategies ) {
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
*/
Compose( 'content_order', function( source, organizer, options ) {
  return source.content_sort( function( a, b ) {
    a = a[ organizer ];
    b = b[ organizer ];
    
    return +( a  >  b )
        || +( a === b ) - 1
    ;
  }, options );
} ); // content_order()

Compose( 'content_sort', function( source, sorter, options ) {
  return source.content_alter( function( content ) {
    return content.sort( sorter );
  }, options );
} ); // content_order()

Compose( 'content_alter', function( source, transform, options ) {
  var content = options.content || 'content'
    , object_clone = extend.object_clone
  ;
  
  return source
    .alter( function( value ) {
      value[ content ] = transform( object_clone( value[ content ] ) );
    } )
  ;
} ); // content_alter()

Compose( 'content_route', function( source, _route, options ) {
  return source.alter( function( route ) {
    route.id = _route;
    
    route.handler = function( request, response, next ) {
      response.end( route.content );
    }
  } );
} );

/* -------------------------------------------------------------------------------------------
   express_route( options )
   
   This is a singleton stateful synchronous greedy pipelet.
   
   Parameters:
   - options (Object):
     - name  (String): debugging name, set on first call to singleton
   
   Express middleware:
   
   app.get( rs.express_route()._router() );
   
   input routes have the following attributes:
   - id (String): absolute pathname for the route
   - handler (Function): express handler, signature:
     handler( request, response, next )
*/
var express_route_singleton;

function Express_Route( options ) {
  if ( express_route_singleton ) return express_route_singleton;
  
  express_route_singleton = this;
  
  Set.call( this, [], { name: options.name } );
  
  // Store state in object for fast lookup by _router()
  this._routes = {};
} // Express_Route()

Set.Build( 'express_route', Express_Route, function( Super ) { return {
  _router: function() {
    de&&ug( 'router middleware initialized' );
    
    var routes = this._routes;
    
    return router;
    
    function router( request, response, next ) {
      var pathname = url.parse( request.url ).pathname
        , handler  = routes[ pathname ]
      ;
      
      de&&ug( 'router middleware, session id: ', request.sessionID
        , ', pathname:', pathname
        , ', session:' , request.session
      );
      
      
      if ( ! handler
        || 'GET' !== request.method
      ) return next();
      
      de&&ug( 'router middleware, session id: ', request.sessionID
        , ', pathname:', pathname
        , ', session:' , request.session
      );
      
      // Provide tracing redirect method into Object response
      response.redirect = redirect;
      
      handler( request, response, next );
      
      function redirect( url ) {
        de&&ug( 'redirecting to : ' + url );
        
        this.writeHead( 302, { location: url } );
        
        this.end();
      } // redirect()
    } // router()
  }, // _router()
  
  _add: function( routes, options ) {
    var _routes = this._routes;
    
    routes.forEach( function( route ) {
      _routes[ route.id ] = route.handler;
      
      de&&ug( 'routes', _routes );
    } );
    
    return Super._add.call( this, routes, options );
  }, // _add()
  
  _remove: function( routes, options ) {
    var _routes = this._routes;
    
    routes.forEach( function( route ) {
      delete _routes[ route.id ];
    } );
    
    return Super._remove.call( this, routes, options );
  }, // _remove()
} } ); // express_route()

/* -------------------------------------------------------------------------------------------
   module exports
*/
RS.add_exports( {
    'Passport_Profiles'   : Passport_Profiles
  , 'Passport_Strategies' : Passport_Strategies
  , 'common_strategies'   : common_strategies
} );

de&&ug( "module loaded" );

// passport.js
