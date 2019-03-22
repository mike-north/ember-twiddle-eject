import { validate } from '../src/twiddle';

QUnit.module('twiddle url | validation', () => {
  QUnit.test('https://ember-twiddle.com/2e7acaf139c066aff67c71ff291d702b', assert => {
    assert.equal(validate('https://ember-twiddle.com/2e7acaf139c066aff67c71ff291d702b'), true);
  });
  QUnit.test('https://canary.ember-twiddle.com/2e7acaf139c066aff67c71ff291d702b', assert => {
    assert.equal(validate('https://canary.ember-twiddle.com/2e7acaf139c066aff67c71ff291d702b'), true);
  });
  QUnit.test('https://gist.github.com/mike-north/2e7acaf139c066aff67c71ff291d702b', assert => {
    assert.equal(validate('https://gist.github.com/mike-north/2e7acaf139c066aff67c71ff291d702b'), true);
  });
  QUnit.test('invalid https://ember-twiddle.com', assert => {
    assert.throws(() => {
      validate('https://ember-twiddle.com');
    });
  });
  QUnit.test('invalid https://ember.com', assert => {
    assert.throws(() => {
      validate('https://ember.com');
    });
  });
  QUnit.test('empty string', assert => {
    assert.throws(() => {
      validate('');
    });
  });
});
