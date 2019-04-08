import * as AdmZip from 'adm-zip';
import * as fs from 'fs';
import fetch from 'node-fetch';
import * as URL from 'url';

const TWIDDLE_DOMAIN = 'ember-twiddle.com';
const GIST_DOMAIN = 'gist.github.com';
const GIT_DOMAIN = 'github.com';
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

/**
 * Given a path, generate single or multi level directory.
 * @param path
 */
function generateDir(path: string) {
  const fullPath = path.split('/').reduce((accumulator, current) => {
    if (!fs.existsSync(accumulator)) {
      fs.mkdirSync(accumulator);
    }
    return `${accumulator}/${current}`;
  });
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath);
  }
}

/**
 * Unzip and extract from a given url and save the data to a path provided.
 * @param gistUrl
 * @param filePath
 * @param targetDir
 */
async function unzipAndExtractFromUrl(gistUrl: string, filePath: string, targetDir: string): Promise<string> {
  const gistLink = await fetch(gistUrl).then(res => res.url);
  const gistDataUrl = `${gistLink}/${filePath}`;
  const newZip = new AdmZip();
  const gistData = await fetch(gistDataUrl)
    .then(x => x.arrayBuffer())
    .then(x => Buffer.from(x));
  const zip = new AdmZip(gistData);
  const zipEntries = zip.getEntries();

  zipEntries.forEach(zipEntry => {
    const fileName = zipEntry.entryName;
    const fileContent = zip.readAsText(fileName);
    // Here remove the top level directory
    const newFileName = fileName.substring(fileName.indexOf('/') + 1);

    // tslint:disable-next-line: no-bitwise
    newZip.addFile(newFileName, (fileContent as unknown) as Buffer, '', 0o644 << 16);
  });

  // Generate the project root directory.
  generateDir(targetDir);
  newZip.extractAllTo(targetDir);
  // tslint:disable-next-line: no-console
  console.log(`Files extracted to path: ${targetDir}`);
  return targetDir;
}

/**
 * Returns the json object for a given path
 * @param targetDir
 * @param fileName
 */
function getJsonFileData(targetDir: string, fileName: string) {
  const file = `${targetDir}/${fileName}.json`;
  const twiddleData = JSON.parse(fs.readFileSync(file, 'utf8'));
  return twiddleData;
}

/**
 * Normalize the generated twiddle to a ember-like structure.
 * @param targetDir
 */
function normalizeTwiddle(targetDir: string) {
  const appDir = `${targetDir}/app`;
  generateDir(appDir);
  const files = fs.readdirSync(targetDir);
  for (let i in files) {
    const file = files[i];
    const dirPath = file.split('.');
    const fileName = dirPath.splice(-2, 2);
    const newPath = `${appDir}/${dirPath.join('/')}`;
    const filePath = `${newPath}/${fileName.join('.')}`;
    // If the file parts length is more than 2 then there is a directory structure expected.
    if (file.split('.').length > 2) {
      generateDir(`${appDir}/${dirPath.join('/')}`);
    }
    if (fileName.length === 2 && fs.existsSync(newPath)) {
      try {
        if (fs.existsSync(filePath)) {
          continue;
        } else {
          fs.renameSync(`${targetDir}/${file}`, filePath);
        }
      } catch (err) {
        throw err;
      }
    }
  }
}

/**
 * Augment the already generated ember-like twiddle project app into a real ember app
 * by augmenting the real Ember app's structure on top of the twiddle app.
 * @param twiddleData
 * @param projectName
 */
async function augmentEmberApp(twiddleData: any, projectName: string) {
  const twiddleItem = JSON.parse(JSON.stringify(twiddleData));
  const emberVersion = twiddleItem.dependencies.ember.split('.');
  emberVersion.pop();
  const emberAppDir = await unzipAndExtractFromUrl(
    `https://${GIT_DOMAIN}/ember-cli/ember-new-output`,
    `archive/v${emberVersion.join('.')}.0.zip`,
    `./${projectName}`
  );
  if (emberAppDir) {
    const packageData = getJsonFileData(emberAppDir, 'package');
    const packageDevDep = packageData.devDependencies;
    const twiddleAddons = twiddleData.addons;
    let isDevDependencyInTwiddle = false;
    Object.keys(twiddleAddons).forEach(item => {
      if (!packageDevDep.hasOwnProperty(item)) {
        isDevDependencyInTwiddle = true;
        packageDevDep[item] = twiddleAddons[item];
      }
    });
    // If there are dev dependencies present in twiddle, add them to the package json of the newly generated ember app.
    if (isDevDependencyInTwiddle) {
      fs.writeFileSync(`${emberAppDir}/package.json`, JSON.stringify(packageData));
    }
    // tslint:disable-next-line:no-console
    console.log('Project converted succesfully!');
  }
}

export default async function twiddleEject(twiddleUrl: string, projectName: string, _options: {} = {}) {
  const gistId = gistIdFromTwiddleUrl(twiddleUrl);
  // tslint:disable-next-line:no-console
  console.log('gistId', gistId);
  // tslint:disable-next-line:no-console
  console.log('project name', projectName);

  // Unzip and extract files from the gist url.
  const targetDir = await unzipAndExtractFromUrl(
    `https://${GIST_DOMAIN}/${gistId}`,
    'archive/HEAD.zip',
    `./${projectName}`
  );
  // tslint:disable-next-line:no-console
  console.log('the target dir', targetDir);
  const twiddleData = getJsonFileData(targetDir, 'twiddle');
  // Validation
  if (twiddleData && !twiddleData.options.use_pods) {
    // Normalize the twiddle to be in the partial ember structure.
    normalizeTwiddle(targetDir);
    // Generate a real Ember app
    augmentEmberApp(twiddleData, projectName);
  } else {
    throw new Error('Pods not supported');
  }
}
