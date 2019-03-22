import * as URL from 'url';

const TWIDDLE_DOMAIN = 'ember-twiddle.com';
const GIST_DOMAIN = 'gist.github.com';
const ALLOWED_TWIDDLE_DOMAINS = [TWIDDLE_DOMAIN, GIST_DOMAIN];

/**
 * Ensure that a string is a URL that corresponds to a twiddle
 * @param url URL to validate
 */
function validateTwiddleUrl(url: string): void {
  try {
    const parsed = URL.parse(url);
    const { host, path } = parsed;
    if (typeof host === 'undefined' || ALLOWED_TWIDDLE_DOMAINS.indexOf(host) < 0) {
      throw new Error(`Invalid twiddle URL domain: ${url}
Allowed domains: \n${ALLOWED_TWIDDLE_DOMAINS.map(d => `  - ${d}\n`)}`);
    }
    if (typeof path === 'undefined' || path.length === 0) {
      // no path
      throw new Error(`Invalid twiddle URL: ${url}`);
    }
  } catch (err) {
    throw new Error(`Invalid twiddle URL: ${url}`);
  }
}

function gistIdFromTwiddleUrl(twiddleUrl: string): string {
  validateTwiddleUrl(twiddleUrl);
  const parsedUrl = URL.parse(twiddleUrl);
  if (parsedUrl.host === TWIDDLE_DOMAIN) {
    return parsedUrl.path || '';
  } else if (parsedUrl.host === GIST_DOMAIN) {
    return parsedUrl.path || '';
  } else {
    throw new Error('Invalid url: ' + twiddleUrl);
  }
}

export default function twiddleEject(twiddleUrl: string, projectName: string, _options: {} = {}) {
  const gistId = gistIdFromTwiddleUrl(twiddleUrl);
  // tslint:disable-next-line:no-console
  console.log('gistId', gistId);
  // tslint:disable-next-line:no-console
  console.log('project name', projectName);
}
