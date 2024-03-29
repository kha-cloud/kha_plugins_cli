const fs = require('fs');
const path = require('path');
const axios = require('axios');
const commentJson = require('comment-json');
const { getPluginInfo } = require('./utils');
const { decompileVue } = require('./vueUtils');

const pluginsFolder = path.join(__dirname, '..', 'plugins');
const rootDir = process.cwd();

const saveApi = (pluginKey, pluginInfo) => {
  const pluginFolder = path.join(pluginsFolder, pluginKey, 'config', 'apis.jsonc');
  const apis = pluginInfo.apis;
  const apisContent = JSON.stringify(apis, null, 2);
  fs.writeFileSync(pluginFolder, apisContent);
};

const saveData = (pluginKey, pluginInfo) => {
  const pluginFolder = path.join(pluginsFolder, pluginKey, 'config', 'database');
  const data = pluginInfo.data;
  const dbSchemaFile = path.join(pluginFolder, 'schema.jsonc');
  const dbSeedFile = path.join(pluginFolder, 'seed.jsonc');
  const dbSchemaContent = JSON.stringify(data.dbSchema, null, 2);
  const dbSeedContent = JSON.stringify(data.dbSeed, null, 2);
  fs.writeFileSync(dbSchemaFile, dbSchemaContent || '[]');
  fs.writeFileSync(dbSeedFile, dbSeedContent || '[]');
};

const savePluginInfo = (pluginKey, pluginInfo) => {
  const pluginFolder = path.join(pluginsFolder, pluginKey);
  const pluginFile = path.join(pluginFolder, 'plugin.jsonc');

  if (!fs.existsSync(pluginFolder)) {
    fs.mkdirSync(pluginFolder);
  }

  var _pluginInfo = JSON.parse(JSON.stringify(pluginInfo));
  delete _pluginInfo.adminUi;
  delete _pluginInfo.controllers;
  delete _pluginInfo.apis;
  delete _pluginInfo.triggers;
  delete _pluginInfo.data;
  const pluginContent = JSON.stringify(_pluginInfo, null, 2);
  fs.writeFileSync(pluginFile, pluginContent);
};

const createFolders = (pluginKey) => {
  const pluginFolder = path.join(pluginsFolder, pluginKey);

  try { fs.mkdirSync(path.join(pluginFolder, 'adminUi')); } catch (error) { }
  try { fs.mkdirSync(path.join(pluginFolder, 'controllers')); } catch (error) { }
  try { fs.mkdirSync(path.join(pluginFolder, 'config')); } catch (error) { }
  try { fs.mkdirSync(path.join(pluginFolder, 'config', 'database')); } catch (error) { }
  try { fs.mkdirSync(path.join(pluginFolder, 'config', 'settings')); } catch (error) { }
};

const savePages = (pluginKey, pluginInfo) => {
  const pluginFolder = path.join(pluginsFolder, pluginKey, 'adminUi');
  const pages = pluginInfo.adminUi.pages;

  // Writing the pages to the plugin folder
  pages.forEach(page => {
    const pageFile = path.join(pluginFolder, "pages" , `${page.key}.vue`);
    // console.log(page);
    // process.exit(0);
    const componentCode = page.code;
    // const componentCode = decompileVue(page.vueComponent, { filename: `${page.key}.vue`, scoped: true });
    fs.writeFileSync(pageFile, componentCode);
  });

  // Writing the rest of the adminUi config
  const configFile = path.join(pluginFolder, 'config.jsonc');

  var _pluginInfoadminUi = JSON.parse(JSON.stringify(pluginInfo.adminUi));
  delete _pluginInfoadminUi.pages;
  const pluginContentadminUi = JSON.stringify(_pluginInfoadminUi, null, 2);
  fs.writeFileSync(configFile, pluginContentadminUi);
};

const downloadPlugin = async () => {
  try {
    const pluginInfo = await getPluginInfo();
    savePluginInfo(pluginKey, pluginInfo);
    createFolders(pluginKey);
    if (pluginInfo.adminUi && pluginInfo.adminUi.pages) {
      savePages(pluginKey, pluginInfo);
    }
    saveApi(pluginKey, pluginInfo);
    saveData(pluginKey, pluginInfo);
    console.log(`Plugin "${pluginKey}" pulled successfully`);
  } catch (error) {
    console.log(error);
  }
};

module.exports = downloadPlugin;
