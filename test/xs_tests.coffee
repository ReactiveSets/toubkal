# xs unit test suite
# ------------------

# include modules
XS = if require? then require '../src/xs.js' else this.XS 

chai = require 'chai' if require?
chai?.should()

describe 'XS test suite:', ->
  it 'XS should be defined:', ->
    XS.should.be.exist
