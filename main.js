#!/usr/bin/env node

// IMPORTS
const fs = require('fs');
const path = require('path');
const commentJson = require('comment-json');

const initPlugin = require('./tasks/initPlugin');
const uploadPlugin = require('./tasks/upload');
const listenForChanges = require('./tasks/listenForChanges');

const initTheme = require('./tasks/themes/init');
const uploadTheme = require('./tasks/themes/upload');
const uploadStaticTheme = require('./tasks/themes/upload_static');

const queryAi = require('./tasks/queryAi');
const helpers = require('./helpers');


// INITIALIZATION
const rootDir = __dirname;
const command = process.argv[2];
const commandArgs = process.argv.slice(3);
const pluginDir = process.cwd();


// LOADING
var isInit = false;
if(!fs.existsSync(path.join(pluginDir, 'plugin.jsonc'))) {
  if (command === 'init') {
    isInit = true;
    initPlugin({
      pluginDir,
      helpers,
    }).then(() => {
      process.exit(1);
    });
  }else {
    console.error('Please run this command from the root of your project');
    console.error('    File not found: ', path.join(pluginDir, 'plugin.jsonc'));
    process.exit(1);
  }
}

if(!fs.existsSync(path.join(pluginDir, 'kha-plugin-config.jsonc')) && !isInit) {
  console.error('Please run this command from the root of your project');
  console.error('    File not found: ', path.join(pluginDir, 'kha-plugin-config.jsonc'));
  process.exit(1);
}

if(!isInit) run();

// MAIN
function main() {
  console.log('Available commands:');
  console.log('    upload');
  console.log('    listen');
  console.log('    init');
  console.log('    ai');
  console.log('    theme');
  console.log('    theme init <THEME_NAME>');
  console.log('    theme upload <THEME_NAME>');
  console.log('    theme static-upload <THEME_NAME>');
  console.log();
  // console.log('rootDir = ', rootDir);
  // console.log('command = ', command);
  // console.log('pluginDir = ', pluginDir);
}

async function run() {

  const pluginData = commentJson.parse(fs.readFileSync(path.join(pluginDir, 'plugin.jsonc'), 'utf8'));

  const pluginKey = pluginData.key;
  const khaConfig = commentJson.parse(fs.readFileSync(path.join(pluginDir, 'kha-plugin-config.jsonc'), 'utf8'));
  khaConfig.url = khaConfig.url.replace(/\/$/, "");

  var cache = helpers.createCacheObject("global_cache", pluginDir);

  var clientCache = helpers.createCacheObject("client_"+helpers.slugify(khaConfig.url.replace("https://", ""))+"_cache", pluginDir);

  var thirdPartyCache = helpers.createCacheObject("third_party_cache", pluginDir);
  
  var context = {
    rootDir,
    command,
    pluginDir,
    pluginData,
    pluginKey,
    khaConfig,
    cache,
    clientCache,
    thirdPartyCache,
    helpers: null
  };
  context.helpers = {
    ...helpers,
    ...helpers.createContextHelpers(context),
  };
  // ctx: (rootDir, command, pluginDir, pluginData, pluginKey, khaConfig, cache, clientCache, thirdPartyCache, helpers)
  // helpers: (sleep, cacheInit, getCache, setCache, createCacheObject, calculateChecksum, slugify, unSlugify, log, stringToHex, pathToLinuxFormat, incrementAlphabetCode)

  // COMMANDS
  if (command === 'upload') {
    uploadPlugin(context);
  }else if (command === 'listen') {
    listenForChanges(context);
  }else if (command === 'ai') {
    queryAi(context);
  } else if (command === 'theme') {
    const themeCommand = commandArgs[0];
    const themeName = commandArgs[1];
    if (themeCommand === 'init') {
      initTheme(context, themeName);
    } else if (themeCommand === 'upload') {
      uploadTheme(context, themeName);
    } else if (themeCommand === 'static-upload') {
      uploadStaticTheme(context, themeName);
    } else {
      console.log('Available commands:');
      console.log('    init <THEME_NAME>');
      console.log('    upload <THEME_NAME>');
      console.log('    static-upload <THEME_NAME>');
      console.log();
    }

  }else {
    main();
  }

}

