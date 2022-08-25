#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const semver = require('semver');
const conventionalChangelog = require('conventional-changelog');
const dayjs = require('dayjs');
const { Command } = require('commander');
const program = new Command();

const PKG_PATH = './package.json';
const CHANGELOG_DIR = './changelog';
const pkg = require(PKG_PATH);
const currentVersion = pkg.version;

program
  .name('release')
  .description('CLI to release')
  .version('1.0.0');

program
  .argument('<string>', 'a semver string');

program.parse();

const args = program.args;
const version = args[0];

if (!semver.valid(version)) {
  console.log('Invalid version!');
}

if (semver.lt(version, currentVersion)) {
  console.log('The version must greater than the package version!');
}

const logName = `CHANGELOG-${version}-${dayjs().format('YYYY.MM.DD')}.md`;
const logPath = path.join(CHANGELOG_DIR, logName);

// 设置pkg.version
setVersion();

// 生成版本日志
genChangelog();

// 增加git-tag
setTag();

function setVersion() {
  pkg.version = version;
  fs.writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2));
}

function genChangelog() {
  if (!fs.existsSync(CHANGELOG_DIR)) {
    fs.mkdirSync(CHANGELOG_DIR);
  }
  const logWs = fs.createWriteStream(logPath);

  conventionalChangelog({
    preset: 'angular',
  })
    .pipe(logWs);

  childProcess.spawn('git', ['add', logPath])
}

function setTag() {
  childProcess.spawn('git', ['tag', `v${version}`])
}
