#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const semver = require('semver');
const conventionalChangelog = require('conventional-changelog');
const dayjs = require('dayjs');
const chalk = require('chalk');
const releasePkg = require('./package.json');
const { Command } = require('commander');
const program = new Command();

const PKG_PATH = './package.json';
const CHANGELOG_DIR = './changelog';
const pkg = JSON.parse(fs.readFileSync(PKG_PATH).toString());
const currentVersion = pkg.version;

program
  .name(releasePkg.name)
  .description(releasePkg.description)
  .version(releasePkg.version);

program
  .argument('<string>', 'A npm version string.');

program.parse();

const args = program.args;
const version = args[0];

if (!/^\d+\.\d+\.\d+/.test(version)) {
  console.log('Invalid npm version!');
  process.exit(1);
}

if (!semver.gt(version, currentVersion)) {
  console.log('The version must greater than the package version!');
  process.exit(1);
}

const tagCp = childProcess.spawn('git', ['tag']);

let tagsBuffer = [];
tagCp.stdout.on('data', (d) => {
  tagsBuffer = tagsBuffer.concat(d);
});

tagCp.stdout.on('end', () => {
  const tags = tagsBuffer.toString().split('\n');
  if (tags.includes(`v${currentVersion}`)) {
    logSuccess('Start working...');
    main();
  } else {
    console.log(`Can\'t find a matched git tag for current npm version!\nPlease update your local git repo for newest git tag.`);
    process.exit(1);
  }
});

tagCp.stderr.on('data', (d) => {
  console.log(d.toString());
  process.exit(1);
});

async function main() {
  const logName = `CHANGELOG-${version}-${dayjs().format('YYYY.MM.DD')}.md`;
  const logPath = path.join(CHANGELOG_DIR, logName);

  // 设置pkg.version
  setVersion();

  // 生成版本日志
  await genChangelog();

  // 增加git-tag
  setTag();

  logSuccess('Done!');

  function setVersion() {
    pkg.version = version;
    fs.writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2));
    logSuccess(`Set npm version (${version})`);
  }

  function genChangelog() {
    return new Promise((resolve) => {
      if (!fs.existsSync(CHANGELOG_DIR)) {
        fs.mkdirSync(CHANGELOG_DIR);
      }
      const logWs = fs.createWriteStream(logPath);

      conventionalChangelog({
        preset: 'angular',
      })
        .pipe(logWs);

      logWs.on('close', () => {
        logSuccess(`Generate changelog (${logPath})`);
        childProcess.spawnSync('git', ['add', logPath]);
        logSuccess(`Git add ${logName}`);
        resolve();
      });
      logWs.on('error', () => {
        childProcess.spawnSync('rm', [logPath]);
        logFailed('Generate changelog');
        process.exit(1);
      });

    });

  }

  function setTag() {
    childProcess.spawnSync('git', ['tag', `v${version}`]);
    logSuccess(`Set git tag (v${version})`);
  }
}

function logSuccess(msg) {
  console.log(`${chalk.green('✔')} ${msg}`);
}

function logFailed(msg) {
  console.log(`${chalk.red('✖')} ${msg}`);
}
