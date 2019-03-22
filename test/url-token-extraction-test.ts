import { gistIdFromUrl } from '../src/twiddle';

QUnit.module('twiddle url | gist token extraction', () => {
  QUnit.test('https://ember-twiddle.com/2e7acaf139c066aff67c71ff291d702b', assert => {
    assert.equal(
      gistIdFromUrl('https://ember-twiddle.com/2e7acaf139c066aff67c71ff291d702b'),
      '2e7acaf139c066aff67c71ff291d702b'
    );
  });
  QUnit.test('https://canary.ember-twiddle.com/2e7acaf139c066aff67c71ff291d702b', assert => {
    assert.equal(
      gistIdFromUrl('https://canary.ember-twiddle.com/2e7acaf139c066aff67c71ff291d702b'),
      '2e7acaf139c066aff67c71ff291d702b'
    );
  });
  QUnit.test('https://gist.github.com/mike-north/2e7acaf139c066aff67c71ff291d702b', assert => {
    assert.equal(
      gistIdFromUrl('https://gist.github.com/mike-north/2e7acaf139c066aff67c71ff291d702b'),
      '2e7acaf139c066aff67c71ff291d702b'
    );
  });
  QUnit.test('https://gist.github.com/2e7acaf139c066aff67c71ff291d702b', assert => {
    assert.equal(
      gistIdFromUrl('https://gist.github.com/2e7acaf139c066aff67c71ff291d702b'),
      '2e7acaf139c066aff67c71ff291d702b'
    );
  });
  QUnit.test('invalid https://ember-twiddle.com', assert => {
    assert.throws(() => {
      gistIdFromUrl('https://ember-twiddle.com');
    });
  });
  QUnit.test('invalid https://ember.com', assert => {
    assert.throws(() => {
      gistIdFromUrl('https://ember.com');
    });
  });
  QUnit.test('empty string', assert => {
    assert.throws(() => {
      gistIdFromUrl('');
    });
  });
});
