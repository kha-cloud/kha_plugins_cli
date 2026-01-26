const fs = require('fs');
const path = require('path');
const commentJson = require('comment-json');
const babel = require('@babel/core');

function replaceDollarWithHash(jsonObj) {
  if (Array.isArray(jsonObj)) {
    jsonObj.forEach(item => replaceDollarWithHash(item));
  } else if (typeof jsonObj === 'object' && jsonObj !== null) {
    for (let key in jsonObj) {
      // If key starts with '$', replace it with '#'
      if (key.startsWith('$')) {
        let newKey = '#' + key.slice(1);
        jsonObj[newKey] = jsonObj[key];
        delete jsonObj[key];
        key = newKey;  // Point key to the updated key
      }

      // If the value is an object or array, recurse
      if (typeof jsonObj[key] === 'object' && jsonObj[key] !== null) {
        replaceDollarWithHash(jsonObj[key]);
      }
    }
  }
  return jsonObj;
}

function replaceInCode(code, ctx) {
  var newCode = code.replace(/@PS\//g, `/api/plugins_static/${ctx.pluginKey}/`);
  // Plugins Key
  newCode = newCode.replace(/@PK/g, `${ctx.pluginKey}`);
  // Plugins API links
  newCode = newCode.replace(/@PA\//g, `/api/plugin_api/${ctx.pluginKey}/`);
  // Plugins VueJS links
  newCode = newCode.replace(/@PV\//g, `/p/${ctx.pluginKey}/`);
  // Plugins VueJS public links
  newCode = newCode.replace(/@PVP\//g, `/public/${ctx.pluginKey}/`);
  return newCode;
}

const getSeed = (ctx) => {
  const dbSeedFile = path.join(ctx.pluginDir, 'config', 'database', 'seed.jsonc');
  const dbSeedContent = fs.readFileSync(dbSeedFile, 'utf8');
  const dbSeed = commentJson.parse(dbSeedContent);
  
  return dbSeed;
};

const getSchema = (ctx) => {
  const modelsFolder = path.join(ctx.pluginDir, 'config', 'database', 'models');
  const dbSchema = {};
  if (!fs.existsSync(modelsFolder)) return dbSchema;

  const modelFiles = fs.readdirSync(modelsFolder).filter((file) => {
    return file.endsWith('.jsonc');
  });
  modelFiles.forEach((modelFile) => {
    const modelFilePath = path.join(modelsFolder, modelFile);
    const modelFileContent = fs.readFileSync(modelFilePath, 'utf8');
    if (modelFileContent.trim() === '') return;
    const model = commentJson.parse(modelFileContent);
    dbSchema[model.model] = model;
  });

  return dbSchema;
};

const getHooks = (ctx, isLastError) => {
  const hooksFolder = path.join(ctx.pluginDir, 'config', 'database', 'hooks');
  const dbHooks = {};
  if (!fs.existsSync(hooksFolder)) return dbHooks;
  
  const hookFiles = fs.readdirSync(hooksFolder).filter((file) => {
    return file.endsWith('.js');
  });
  hookFiles.forEach((hookFile) => {
    const hookFilePath = path.join(hooksFolder, hookFile);
    const hookName = hookFile.split('.').slice(0, -1).join('.');
    // Check if the file is updated (compare the last modified time from cache)
    const lastModifiedTime = ctx.cache.get("HookFileLastModifiedTime"+hookFilePath);
    const currentModified = fs.statSync(hookFilePath).mtime.getTime();
    if ((lastModifiedTime && lastModifiedTime === currentModified) && !isLastError) {
      dbHooks[hookName] = ctx.cache.get("HookFileContent"+hookFilePath);
      return;
    } else {
      ctx.cache.set("HookFileLastModifiedTime"+hookFilePath, currentModified);
    }

    const hookFileContent = eval(fs.readFileSync(hookFilePath, 'utf8'));
    const hook = replaceDollarWithHash(hookFileContent);
    if(typeof hook.action === 'string') {
      hook.action = babel.transformSync(hook.action, {
        presets: ['@babel/preset-env'],
      }).code;
      hook.action = replaceInCode(hook.action, ctx);
    }
    ctx.cache.set("HookFileContent"+hookFilePath, hook);
    dbHooks[hookName] = hook;
  });

  return dbHooks;
};

const getSettingsSchema = (ctx) => {
  const settingsSchemaFile = path.join(ctx.pluginDir, 'config', 'settings', 'schema.jsonc');
  const settingsSchemaContent = fs.readFileSync(settingsSchemaFile, 'utf8');
  const settingsSchema = commentJson.parse(settingsSchemaContent).map((setting) => {
    var group;
    if (setting.group && setting.group.startsWith('#')) {
      group = setting.group.slice(1);
    } else if (setting.group && 
      "private theme_template header_template footer_template about_us_template contact_template".includes(setting.group)
    ) {
      group = setting.group;
    } else {
      group = ctx.pluginKey + '.' + setting.group;
    }
    return {
      ...setting,
      key: ctx.pluginKey + '.' + setting.key,
      group,
    };
  });

  return settingsSchema;
};

const getSettingsData = (ctx) => {
  const settingsDataFile = path.join(ctx.pluginDir, 'config', 'settings', 'data.jsonc');
  const settingsDataContent = fs.readFileSync(settingsDataFile, 'utf8');
  const settingsData = commentJson.parse(settingsDataContent);

  return settingsData;
};

module.exports = async (ctx) => {
  const isLastError = ctx.cache.get('config-assembling-error');
  ctx.cache.set('config-assembling-error', true); // If do not reach end of the function, it means there is an error

  const originalDirectory = process.cwd();
  const packageDirectory = path.resolve(__dirname);

  // Switch to the package directory
  process.chdir(packageDirectory);

  // Database data
  const dbSeed = getSeed(ctx);
  const dbSchema = getSchema(ctx,);
  const dbHooks = getHooks(ctx, isLastError);

  // Settings data
  const settingsSchema = getSettingsSchema(ctx);
  const settingsData = getSettingsData(ctx);

  process.chdir(originalDirectory);

  ctx.cache.set('config-assembling-error', false);

  return {
    dbSeed,
    dbSchema,
    hooks: dbHooks,
    settingsSchema,
    settingsData,
  };
};