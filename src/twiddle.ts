import * as URL from 'url';

const TWIDDLE_DOMAIN = 'ember-twiddle.com';
const GIST_DOMAIN = 'gist.github.com';
const ALLOWED_TWIDDLE_DOMAINS = [TWIDDLE_DOMAIN, `canary.${TWIDDLE_DOMAIN}`, GIST_DOMAIN];

/**
 * Ensure that a string is a URL that corresponds to a twiddle
 * @param url URL to validate
 */
export function validate(url: string): boolean {
  try {
    const parsed = URL.parse(url);
    const { host, path } = parsed;
    if (typeof host === 'undefined' || ALLOWED_TWIDDLE_DOMAINS.indexOf(host) < 0) {
      throw new Error(`Invalid twiddle URL domain: ${url}
Allowed domains: \n${ALLOWED_TWIDDLE_DOMAINS.map(d => `  - ${d}\n`)}`);
    }
    if (typeof path === 'undefined' || path.length < 10) {
      // no path
      throw new Error(`Invalid twiddle URL: ${url}`);
    }
    return true;
  } catch (err) {
    throw new Error(`Invalid twiddle URL: ${url}`);
  }
}

export function gistIdFromUrl(twiddleUrl: string): string {
  validate(twiddleUrl);
  const parsedUrl = URL.parse(twiddleUrl);
  const { path } = parsedUrl;
  if (typeof path === 'undefined') {
    throw new Error('Invalid url: ' + twiddleUrl);
  }
  let parts: string[] = path
    .substr(1)
    .split('/')
    .filter(x => x && x.length > 20 && /^[0-9abcdef]+$/.test(x));
  return parts[0];
}
