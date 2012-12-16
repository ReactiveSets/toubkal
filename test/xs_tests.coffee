# xs unit test suite
# ------------------

# include modules
XS   = require '../src/xs.js' if require?
chai = require 'chai' if require?
chai?.should()

describe 'XS test suite:', ->
  it 'XS should be defined:', ->
    XS.should.be.exist