// test/file.js
//  test for .file()
//
// 2013/10/30 by JHR

var xs = require( "excess/lib/xs.js" ).XS;
  require( "excess/lib/fluid.js"     );
  require( "excess/lib/pipelet.js"   );
  require( "excess/lib/tracer.js"    );
  require( "excess/lib/persist.js"   );
var l8    = require( 'l8/lib/l8.js'  );
var log   = xs.log;
var fluid = xs.fluid; 

var assert = l8.mand;

// ToDo: a fluid factory for an empty set should let me avoid using null
var smoke = fluid.set( null, { name: "smoke" } );

var file = smoke.file( { mode: "truncate" });

file.trace();
smoke.trace();

// Add to file
file.add(  [ { article: 1, text: "hello" }, { article: 2, text: "world"} ] );

// Add to file's source
smoke.add( [ { article: 3, text: "hello" }, { article: 4, text: "world"} ] );

// Same file
var file2 = fluid.file( "smoke" );

// Dependent set, should have the same content as file, eventually
var smoke2 = file2.set( { name: "more smoke"} ).trace();

// Add to file
file2.add(  [ { article: 5, text: "hello" }, { article: 6, text: "world"} ] );

l8.task(function(){
  
  l8.step(function(){
    l8.sleep( 2000);
    
  }).step(function(){
    smoke.add(  [ { article:  7, text: "smoke again" } ] );
    file.add(   [ { article:  8, text: "and again"   } ] );
    file2.add(  [ { article:  9, text: "again again" } ] );
    // This add must no go in the file
    smoke2.add( [ { article: 10, text: "not that"    } ] );
    
  }).step(function(){
    l8.sleep( 3000 );
    
  }).step(function(){
    log( "CHECK" );
    assert( file.count_add === 6 );
    log( "TEST SUCCESS" );
    process.exit( 0 );
    
  }).failure(function( e ){
    log( "unexpected error", e );
    process.exit( 1 );
  });
});

// ToDo: another task that reopen the file and checks its content!

l8.countdown( 10 );

process.on( 'exit', function () {
  xs.log( 'File test says "Bye bye."' );
} );
 
process.on( 'uncaughtException', function( err ) {
  xs.log( err.stack.replace( /^    /gm, '                  ') );
});
