import hello from 'ember-twiddle-eject';

QUnit.module('ember-twiddle-eject tests');

QUnit.test('hello', assert => {
  assert.equal(hello(), 'Hello from ember-twiddle-eject');
});
