import * as AdmZip from 'adm-zip';
import * as debug from 'debug';
import * as fs from 'fs';
import { mkdirsSync, readJSONSync, writeJSONSync } from 'fs-extra';
import fetch from 'node-fetch';
import * as ora from 'ora';
import * as path from 'path';
import * as semver from 'semver';
import * as URL from 'url';

const log = debug('twiddle-eject');
const spinner = ora();
const TWIDDLE_DOMAIN = 'ember-twiddle.com';
const GIST_DOMAIN = 'gist.github.com';
const GIT_DOMAIN = 'github.com';
const ALLOWED_TWIDDLE_DOMAINS = [TWIDDLE_DOMAIN, GIST_DOMAIN];

interface GitTag {
  name: string;
  zipball_url: string;
  commit: {
    sha: string;
  };
}

/**
 * Ensure that a string is a URL that corresponds to a twiddle
 * @param url URL to validate
 */
function validateTwiddleUrl(url: string): void {
  try {
    const parsed = URL.parse(url);
    const { host, path: twiddlePath } = parsed;
    if (typeof host === 'undefined' || ALLOWED_TWIDDLE_DOMAINS.indexOf(host) < 0) {
      throw new Error(`Invalid twiddle URL domain: ${url}
Allowed domains: \n${ALLOWED_TWIDDLE_DOMAINS.map(d => `  - ${d}\n`)}`);
    }
    if (typeof twiddlePath === 'undefined' || twiddlePath.length === 0) {
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
 * Unzip and extract from a given url and save the data to a path provided.
 * @param gistUrl
 * @param filePath
 * @param targetDir
 */
async function unzipAndExtractFromUrl(gistUrl: string, filePath: string, targetDir: string): Promise<string> {
  const { url: gistLink } = await fetch(gistUrl);
  const gistDataUrl = `${gistLink}/${filePath}`;
  const newZip = new AdmZip();
  const gistResponse = await fetch(gistDataUrl);
  const gistData = Buffer.from(await gistResponse.arrayBuffer());
  const zip = new AdmZip(gistData);
  const zipEntries = zip.getEntries();

  zipEntries.forEach(zipEntry => {
    const fileName = zipEntry.entryName;
    const fileContent = Buffer.from(zip.readAsText(fileName), 'utf-8');
    // Here remove the top level directory
    const newFileName = fileName.substring(fileName.indexOf('/') + 1);
    newZip.addFile(newFileName, fileContent, '');
  });

  // Generate the project root directory.
  mkdirsSync(targetDir);
  newZip.extractAllTo(targetDir);
  log(`Files extracted to path: ${targetDir}`);
  return targetDir;
}

/**
 * Returns the json object for a given path
 * @param targetDir
 * @param fileName
 */
function getJsonFileData(targetDir: string, fileName: string) {
  // const file = `${targetDir}/${fileName}.json`;
  const file = path.join(targetDir, `${fileName}.json`);
  try {
    return readJSONSync(file);
  } catch (err) {
    throw err;
  }
}

/**
 * Normalize the generated twiddle to a ember-like structure.
 * @param targetDir
 */
function normalizeTwiddle(targetDir: string) {
  const appDir = path.join(targetDir, 'app');
  mkdirsSync(appDir);
  const files = fs.readdirSync(targetDir);
  for (let i in files) {
    const file = files[i];
    const dirPath = file.split('.');
    const fileName = dirPath.splice(-2, 2);
    const newPath = path.join(appDir, ...dirPath);
    const filePath = path.join(newPath, fileName.join('.'));
    // If the file parts length is more than 2 then there is a directory structure expected.
    if (file.split('.').length > 2) {
      mkdirsSync(path.join(appDir, ...dirPath));
    }
    if (fileName.length === 2 && fs.existsSync(newPath)) {
      try {
        if (fs.existsSync(filePath)) {
          continue;
        } else {
          fs.renameSync(path.join(targetDir, file), filePath);
        }
      } catch (err) {
        throw err;
      }
    }
  }
}

async function getLatestEmberVersion(verString: string, accessToken: string | undefined) {
  const response = await fetch(
    'https://api.github.com/repos/ember-cli/ember-new-output/tags?per_page=300' +
      (accessToken ? `&access_token=${accessToken}` : '')
  );
  const responseJson = await response.json();
  const ver = semver.parse(verString);
  const verMap = new Map<semver.SemVer, GitTag>(responseJson.map((tag: GitTag) => [semver.parse(tag.name), tag]));
  if (ver) {
    const bestVer = semver.maxSatisfying([...verMap.keys()], `${ver.major}.${ver.minor}`);
    if (bestVer) {
      return verMap.get(bestVer);
    }
  }
  throw new Error('The version does not exist');
}
/**
 * Augment the already generated ember-like twiddle project app into a real ember app
 * by augmenting the real Ember app's structure on top of the twiddle app.
 * @param twiddleData
 * @param projectName
 */
async function augmentEmberApp(twiddleData: any, projectName: string, accessToken: string | undefined) {
  const twiddleDependencies = { ...twiddleData.dependencies };
  const latestEmberVersion = await getLatestEmberVersion(twiddleDependencies.ember, accessToken);
  if (latestEmberVersion) {
    const emberAppDir = await unzipAndExtractFromUrl(
      `https://${GIT_DOMAIN}/ember-cli/ember-new-output`,
      `archive/${latestEmberVersion.name}.zip`,
      path.join('.', projectName)
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
        writeJSONSync(path.join(emberAppDir, 'package.json'), packageData);
      }
    } else {
      throw new Error('Something went wrong while extracting and building the Ember app');
    }
  } else {
    throw new Error('Something went wrong while fetching the latest Ember version');
  }
}

export default async function twiddleEject(twiddleUrl: string, projectName: string, _options: any = {}) {
  const gistId = gistIdFromTwiddleUrl(twiddleUrl);
  log('gistId: ', gistId);
  log('project name: ', projectName);
  spinner.start('Extracting files from the twiddle url');
  // Unzip and extract files from the gist url.
  const targetDir = await unzipAndExtractFromUrl(
    `https://${GIST_DOMAIN}/${gistId}`,
    'archive/HEAD.zip',
    path.join('.', projectName)
  );
  spinner.succeed();
  log('the target directory: ', targetDir);
  const twiddleData = getJsonFileData(targetDir, 'twiddle');
  // Validation
  if (twiddleData && !twiddleData.options.use_pods) {
    spinner.start('Generating the Ember app from twiddle');
    // Normalize the twiddle to be in the partial ember structure.
    normalizeTwiddle(targetDir);
    // Generate a real Ember app
    augmentEmberApp(twiddleData, projectName, _options.accessToken).then(() =>
      spinner.succeed('Project converted succesfully!')
    );
  } else {
    throw new Error('Pods not supported');
  }
}
