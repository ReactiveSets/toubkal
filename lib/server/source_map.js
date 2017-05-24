/*  source_map.js
    
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

var source_map = require( 'source-map' )
  , Consumer   = source_map.SourceMapConsumer
  , Generator  = source_map.SourceMapGenerator
  , path       = require( 'path' )
  , rs         = require( '../core/pipelet.js' )
  , RS         = rs.RS
  , log        = RS.log.bind( null, 'source_map' )
  , de         = true
  , ug         = log
  , extend     = RS.extend
  , extend_2   = extend._2
  , is_array   = RS.is_array
  , Pipelet    = RS.Pipelet
  , Set        = RS.Set
;

module.exports = rs
  /* --------------------------------------------------------------------------
      @pipelet source_map_consume( options )
  */
  .Compose( 'source_map_consume', function( source, options ) {
    return source.alter( consume, options );
    
    function consume( file ) {
      var source_map = file.source_map;
      
      if( source_map && ! file.source_mappings ) {
        var consumer = new Consumer( source_map )
          , mappings = file.source_mappings = []
        ;
        
        consumer.eachMapping( function( mapping ) {
          mappings.push( {
            generated: {
              line  : mapping.generatedLine,
              column: mapping.generatedColumn
            },
            
            original: {
              line  : mapping.originalLine,
              column: mapping.originalColumn
            },
            
            source: mapping.source
          } );
        } )
      }
    } // consume()
  } ) // source_map_consume()
  
  /* --------------------------------------------------------------------------
      @pipelet source_map_generate( options )
  */
  .Compose( 'source_map_generate', function( source, options ) {
    return source.alter( generate, options );
    
    function generate( _ ) {
      var file            = _.path
        , source_mappings = _.source_mappings
        , generator
      ;
      
      if( file && source_mappings ) {
        generator = new Generator( { file: file } );
        
        source_mappings.forEach( function( mapping ) {
          generator.addMapping( mapping );
        } );
        
        _.source_map = generator.toString();
      }
    } // generate()
  } ) // source_map_generate()
  
  /* --------------------------------------------------------------------------
      @pipelet source_mappings_new_path( options )
  */
  .Compose( 'source_mappings_new_path', function( source, source_map_path, options ) {
    var source_map_directory = path.dirname( source_map_path );
    
    return source.alter( fix_mappings, options );
    
    function fix_mappings( _ ) {
      var mappings   = _.source_mappings
        , difference = path.relative( path.dirname( _.source_map_path || '' ), source_map_directory )
      ;
      
      if( mappings && difference )
        _.source_mappings = mappings.map( fix_mapping )
      ;
      
      _.source_map_path = source_map_path;
      
      function fix_mapping( mapping ) {
        return {
          generated: mapping.generated,
          original : mapping.original,
          source   : path.join( difference, mapping.source )
        };
      } // fix_mapping()
    } // fix_mappings()
  } ) // source_mappings_new_path()
  
  /* --------------------------------------------------------------------------
      pipelet ( options )
  */
  .Compose( 'source_mappings_bundle', function( source, bundle_path, options ) {
    return source.alter( bundle, options );
    
    function bundle( _ ) {
      var offset = 0
        , all_mappings  = _.source_mappings = []
        , source_bundle = ''
      ;
      
      _.sources.map( add_file );
      
      _.source = source_bundle;
      
      function add_file( file, i ) {
        var mappings = file.source_mappings
          , map_name = file.source_map_name
          , source   = file.source.replace( /\n\s*\/\/[@#]\s+sourceMappingURL=.*/, '//' )
        ;
        
        if( i ) {
          source_bundle += '\n';
          offset += 1;
        }
        
        source_bundle += source;
        
        mappings && mappings.forEach( function( mapping ) {
          mapping = extend_2( {}, mapping );
          
          var generated = mapping.generated = extend_2( {}, mapping.generated );
          
          generated.line += offset;
          
          all_mappings.push( mapping );
        } );
        
        offset += ( source.match( /\n/g ) || [] ).length + 1;
      } // add_file()
    } // bundle()
  } ) // source_mappings_bundle()
  
  /* --------------------------------------------------------------------------
      pipelet bundle_javascript( options )
  */
  .Compose( 'bundle_javascript', function( source, bundle_path, options ) {
    return source
      // use acorn to get comments for documentation and AST
      // .acorn()
      
      // uglify files separately to allow origin source maps, bundling done later
      // .uglify_one()
      
      .source_map_consume()
      
      .source_mappings_new_path( bundle_path + '.map' )
      
      .group( function( _ ) { return {} }, { content: 'sources' } )
      
      // process only add operations, for efficiency
      .adds()
      
      // create source bundle and bundle source mappings
      .source_mappings_bundle()
      
      .source_map_generate()
      
      // make updates
      .last()
    ;
  } ) // bundle_javascript()
;

