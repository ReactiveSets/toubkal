XS Test Suite

Description

A javascript unit test suite using mocha testing framework and chai, an assertion library.

What we need

We need to have Node.js and the Node Package Manager (npm) installed, coffeescript, mocha and chai libraries.

Instalation

You can install these modules globally by using the npm option -g, or in a node_modules directory in the root.

Mocha
~/node_modules $ npm install mocha

Chai
~/node_modules $ npm install chai

Coffee-script
~/node_modules $ npm install coffee-script


Example: test if XS is a function

First we have to import the Chai library and enabling the BDD syntax

XS   = require '../lib/xs.js' if require?
chai = require 'chai' if require?
chai?.should()

describe 'XS test suite:', ->
  it 'xDs should be a function', ->
    XS.should.be.a 'function'

To run this test, open a command prompt and cd to the project folder, then run this command:

$ mocha --compilers coffee:coffee-script

Mocha doesn't check for CoffeeScript by default, so we have to use the --compilers flag to tell Mocha what compiler to use if it finds a file with the coffee file extension.
You should get errors that look like this:

  ........

  × 1 of 8 tests failed:

  1) XS test suite: XS.extend() test suite: o2 should be deep equal to _o2:
     expected { email: 'knassik@gmail.com' } to not deeply equal { email: 'knassik@gmail.com' }

You can also compile the CoffeeScript file and generate the javascript by runing:

$ coffee --watch --compile test/

then run the tests:

$ mocha

Mocha reporters

Mocha reporters adjust to the terminal window, and always disable ansi-escape colouring when the stdio streams are not associated with a tty. By default mocha use 'dot matrix' reporter
You can use a specific reporter( Spec for example ) by adding option '--reporter spec': 

$ mocha -R spec --compilers coffee:coffee-script
or
$ mocha -R spec


which results:


  clone():
    V foo should be deep equal to bar

  XS test suite:
    V xDs should be a function
    XS.extend() test suite:
      V extend( object ) should be equal to object
      V extend( object1, object2 ) should be equal to object
      1) o2 should be deep equal to _o2
      V extend( object1, object2, object3 ) should be equal to object
      V o2 should be deep equal to _o2
      V o3 should be deep equal to _o3


  x 1 of 8 tests failed:

  1) XS test suite: XS.extend() test suite: o2 should be deep equal to _o2:
     expected { email: 'knassik@gmail.com' } to not deeply equal { email: 'knassik@gmail.com' }



