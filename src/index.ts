import * as AdmZip from 'adm-zip';
import * as fs from 'fs';
import * as request from 'request';
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
  const gistUrl = `https://${GIST_DOMAIN}/${gistId}`;
  request(gistUrl, (e, response) => {
    const gistDataUrl = response.request.uri.href + '/archive/HEAD.zip';
    const newZip = new AdmZip();
    request.get({ url: gistDataUrl, encoding: null }, (err, res, body) => {
      const zip = new AdmZip(body);
      const zipEntries = zip.getEntries();

      zipEntries.forEach(zipEntry => {
        const fileName = zipEntry.entryName;
        const fileContent = zip.readAsText(fileName);
        // Here remove the top level directory
        const newFileName = fileName.substring(fileName.indexOf('/') + 1);

        // tslint:disable-next-line: no-bitwise
        newZip.addFile(newFileName, (fileContent as unknown) as Buffer, '', 0o644 << 16);
      });

      const targetDir = `./${projectName}`;
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir);
      }
      newZip.extractAllTo(targetDir);
      // tslint:disable-next-line: no-console
      console.log(`Files extracted to ${projectName} path: ${targetDir}`);
    });
  });
}
