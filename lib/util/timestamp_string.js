/*  timestamp_string.js
    
    The MIT License (MIT)
    
    Copyright (c) 2013-2015, Reactive Sets
    
    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:
    
    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.
    
    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
*/

/* --------------------------------------------------------------------------------------
    timestamp_string( date )
    
    Returns a local timestamp string from Date instance using the format:
      YYYY/MM/DD hh:mm:ss.mmm
      
    Example:
      2015/05/06 12:11:14.980
*/
( this.undefine || require( 'undefine' )( module, require ) )()
( 'timestamp_string', [ './lap_timer' ], function( Lap_Timer ) {
  
  return timestamp_string;
  
  // ToDo: Test and document timestamp_string()
  function timestamp_string( date ) {
    date || ( date = new Date );
    
    var year     = "" + date.getFullYear()
      , month    = "" + ( date.getMonth() + 1 )
      , day      = "" + date.getDate()
      , hour     = "" + date.getHours()
      , minutes  = "" + date.getMinutes()
      , seconds  = "" + date.getSeconds()
      , ms       = "" + date.getMilliseconds()
    ;
    
    if ( month  .length < 2 ) month    = "0" + month
    if ( day    .length < 2 ) day      = "0" + day;
    if ( hour   .length < 2 ) hour     = "0" + hour;
    if ( minutes.length < 2 ) minutes  = "0" + minutes;
    if ( seconds.length < 2 ) seconds  = "0" + seconds;
    
    switch( ms.length ) {
      case 2: ms =  "0" + ms; break;
      case 1: ms = "00" + ms; break;
    }
    
    return year + '/' + month + '/' + day + ' '
      + hour + ':' + minutes + ':' + seconds
      + '.' + ms
    ;
  } // timestamp_string()
} ); // timestamp_string.js
