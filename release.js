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
  .argument('<string>', 'A npm version string.')
  .option('-t, --temp', 'Only print changelog.')
  .action(releaseAction);

program.command('sync')
  .description('Sync git tag with npm version.')
  .action(syncAction);

program.parse();

async function releaseAction(version, options) {
  // 检测版本号是否正确
  if (!/^\d+\.\d+\.\d+/.test(version)) {
    console.log('Invalid npm version!');
    return
  }

  // 检测版本号是否小于当前版本
  if (semver.lt(version, currentVersion)) {
    console.log('The version can\'t less than the package version!');
    return
  }

  // 获取所有tags
  const tags = childProcess.spawnSync('git', ['tag']).stdout.toString().split('\n');

  // 不存在当前版本的tag，提示更新仓库tag，或者使用sync命令同步npmVersion到git-tag
  if (!tags.includes(`v${currentVersion}`)) {
    console.log('Can\'t find a matched git tag for current npm version!');
    console.log(`Please update your local git repo for newest git tag, or you can use "release-log sync" set git tag to current npm version`);
    return
  }

  // 如果是临时预览
  if (options.temp) {
    setNpmVersion(version);
    const s = getChangelogStream()
    s.pipe(process.stdout);
    s.on('close', () => {
      setNpmVersion(currentVersion);
    });
    return
  }
  // 如果设置相同的版本号，删除此次tag，构建新的当前版本
  if (semver.eq(version, currentVersion)) {
    childProcess.spawnSync('git', ['tag', '-d', `v${version}`]);
  }

  logSuccess('Start working...');

  const logName = `CHANGELOG-${version}-${dayjs().format('YYYY.MM.DD')}.md`;
  const logPath = path.join(CHANGELOG_DIR, logName);

  // 设置pkg.version
  setNpmVersion(version);
  logSuccess(`Set npm version (${version})`);

  // 生成版本日志
  await genChangelog(logPath, logName);

  // 增加git-tag
  setGitTag(version);
  logSuccess(`Set git tag (v${version})`);

  logSuccess('Done!');
}

function syncAction () {
  setGitTag(currentVersion)
  logSuccess(`Set git tag (v${currentVersion})`);
}

function getChangelogStream(config) {
  return conventionalChangelog({
    preset: 'angular',
    ...config
  })
}

function genChangelog(logPath, logName) {
  return new Promise((resolve) => {
    if (!fs.existsSync(CHANGELOG_DIR)) {
      fs.mkdirSync(CHANGELOG_DIR);
    }
    const logWs = fs.createWriteStream(logPath);

    getChangelogStream().pipe(logWs);

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

function setGitTag(version) {
  childProcess.spawnSync('git', ['tag', `v${version}`]);
}

function setNpmVersion(version) {
  pkg.version = version;
  fs.writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2));
}

function logSuccess(msg) {
  console.log(`${chalk.green('✔')} ${msg}`);
}

function logFailed(msg) {
  console.log(`${chalk.red('✖')} ${msg}`);
}
