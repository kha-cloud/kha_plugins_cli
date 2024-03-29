const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');

function snakeCase(str) {
  return str.replace(/([A-Z])/g, function($1){return "_"+$1.toLowerCase();})
          .replace(/^_/, "") // Remove first underscore
          .replace(/_$/, "") // Remove last underscore
          .replace(/-+/g, "_")
          .replace(/__+/g, "_") // Replace multiple underscores with one
          .replace(/\s+/g, '')
          .replace(/[^a-zA-Z0-9_]/g, '');
}

module.exports = async (ctx) => {

  // ===========================================================================================
  //                                        PLUGIN CREATION
  // ===========================================================================================

  // Ask for the plugin name
  const pluginName = await inquirer.prompt({
    type: 'input',
    name: 'pluginName',
    message: 'What is the name of the plugin?',
    default: ctx.helpers.unSlugify(path.basename(ctx.pluginDir))
  });

  // Ask for the plugin key (suggesting the plugin name in snake_case)
  const pluginKey = await inquirer.prompt({
    type: 'input',
    name: 'pluginKey',
    message: 'What is the key of the plugin?',
    default: snakeCase(pluginName.pluginName)
  });

  // Ask for the plugin description
  const pluginDescription = await inquirer.prompt({
    type: 'input',
    name: 'pluginDescription',
    message: 'What is the description of the plugin?',
    default: 'A plugin for the KhaCloud platform'
  });

  // Create the `plugin.jsonc`
  const pluginJsonc = {
    engine_version: "2",
    pluginVersion: '0.0.1',
    name: pluginName.pluginName,
    key: pluginKey.pluginKey,
    description: pluginDescription.pluginDescription,
    icon: "",
    permissions: {},
  };
  fs.writeFileSync(path.join(ctx.pluginDir, 'plugin.jsonc'), JSON.stringify(pluginJsonc, null, 2));

  // Create the cache/dist folder
  fs.mkdirSync(path.join(ctx.pluginDir, '.cache'));
  fs.mkdirSync(path.join(ctx.pluginDir, '.cache', 'dist'));

  // ===========================================================================================
  //                                        API DATA
  // ===========================================================================================

  // Ask for the App's url (Optional)
  const appUrl = await inquirer.prompt({
    type: 'input',
    name: 'appUrl',
    message: 'What is the url of the app (Optional)?',
    default: 'https://my-website.com'
  });

  // Ask for the App's token (Optional)
  const appToken = await inquirer.prompt({
    type: 'input',
    name: 'appToken',
    message: 'What is the token of the app (Optional)?',
    default: '<your-auth-token>'
  });

  // Ask for the OpenAi's token (Optional)
  const openAiToken = await inquirer.prompt({
    type: 'input',
    name: 'openAiToken',
    message: 'What is the token for OpenAi (Optional)?',
    default: '<OPTIONAL-your-openai-token>'
  });

  // Create the `kha-plugin-config.jsonc`
  const khaPluginConfigJsonc = {
    url: appUrl.appUrl,
    token: appToken.appToken,
    openai_key: openAiToken.openAiToken,
  };
  fs.writeFileSync(path.join(ctx.pluginDir, 'kha-plugin-config.jsonc'), JSON.stringify(khaPluginConfigJsonc, null, 2));

  // ===========================================================================================
  //                                        OPTIONAL PARTS
  // ===========================================================================================


  // -------------------------------------------------------------------- adminUI
  if(!fs.existsSync(path.join(ctx.pluginDir, 'adminUI'))){
    // Ask if the plugin has an admin UI
    const hasAdminUi = await inquirer.prompt({
      type: 'confirm',
      name: 'hasAdminUi',
      message: 'Does the plugin have an admin UI?'
    });
  
    if (hasAdminUi.hasAdminUi) {
      // Folders
      fs.mkdirSync(path.join(ctx.pluginDir, 'static'));
      fs.mkdirSync(path.join(ctx.pluginDir, 'adminUI'));
      fs.mkdirSync(path.join(ctx.pluginDir, 'adminUI', 'pages'));
      fs.writeFileSync(path.join(ctx.pluginDir, 'adminUI', 'pages', '.gitkeep'), '');
      fs.mkdirSync(path.join(ctx.pluginDir, 'adminUI', 'public_pages'));
      fs.writeFileSync(path.join(ctx.pluginDir, 'adminUI', 'public_pages', '.gitkeep'), '');
      fs.mkdirSync(path.join(ctx.pluginDir, 'adminUI', 'components'));
      fs.writeFileSync(path.join(ctx.pluginDir, 'adminUI', 'components', '.gitkeep'), '');
      fs.mkdirSync(path.join(ctx.pluginDir, 'adminUI', 'partials'));
      fs.writeFileSync(path.join(ctx.pluginDir, 'adminUI', 'partials', '.gitkeep'), '');
      fs.mkdirSync(path.join(ctx.pluginDir, 'adminUI', 'scripts'));
      fs.writeFileSync(path.join(ctx.pluginDir, 'adminUI', 'scripts', '.gitkeep'), '');
      fs.mkdirSync(path.join(ctx.pluginDir, 'adminUI', 'utils'));
      fs.writeFileSync(path.join(ctx.pluginDir, 'adminUI', 'utils', '.gitkeep'), '');

      // Files
      fs.writeFileSync(path.join(ctx.pluginDir, 'adminUI', 'config.jsonc'), "{}");
      fs.writeFileSync(path.join(ctx.pluginDir, 'adminUI', 'menus.jsonc'), `{\n  "mainMenu": [\n  ],\n  "profileMenu": [\n  ],\n  "hideMainMenu": [\n  ]\n}`);
      fs.writeFileSync(path.join(ctx.pluginDir, 'adminUI', 'store.js'),
      `module.exports = {\n`+
      `  namespaced: true,\n`+
      `  state: () => ({\n`+
      `  }),\n`+
      `  mutations: {\n`+
      `  },\n`+
      `  actions: {\n`+
      `  },\n`+
      `  getters: {\n`+
      `  },\n`+
      `};\n`+
      ``);
    }
  }

  // -------------------------------------------------------------------- api
  if(!fs.existsSync(path.join(ctx.pluginDir, 'api'))){
    // Ask if the plugin has an api
    const hasApi = await inquirer.prompt({
      type: 'confirm',
      name: 'hasApi',
      message: 'Does the plugin have an api?'
    });

    if (hasApi.hasApi) {
      // Folders
      fs.mkdirSync(path.join(ctx.pluginDir, 'api'));
      fs.mkdirSync(path.join(ctx.pluginDir, 'api', 'controllers'));
      fs.writeFileSync(path.join(ctx.pluginDir, 'api', 'controllers', '.gitkeep'), '');

      // Files
      fs.writeFileSync(path.join(ctx.pluginDir, 'api', 'io.js'), `// Code directly here\n// Available variables ctx, socket, global_data, Store, ObjectId\n\n`);
      fs.writeFileSync(path.join(ctx.pluginDir, 'api', 'routes.js'), `module.exports = [\n];`);
      fs.writeFileSync(path.join(ctx.pluginDir, 'api', 'hooks.js'), `module.exports = [\n];`);
    }
  }

  // -------------------------------------------------------------------- config
  if(!fs.existsSync(path.join(ctx.pluginDir, 'config'))){
    // Ask if the plugin has a config
    const hasConfig = await inquirer.prompt({
      type: 'confirm',
      name: 'hasConfig',
      message: 'Does the plugin have a config?'
    });

    if (hasConfig.hasConfig) {
      // Folders
      fs.mkdirSync(path.join(ctx.pluginDir, 'config'));
      fs.mkdirSync(path.join(ctx.pluginDir, 'config', 'database'));
      fs.mkdirSync(path.join(ctx.pluginDir, 'config', 'database', 'hooks'));
      fs.writeFileSync(path.join(ctx.pluginDir, 'config', 'database', 'hooks', '.gitkeep'), '');
      fs.mkdirSync(path.join(ctx.pluginDir, 'config', 'database', 'models'));
      fs.writeFileSync(path.join(ctx.pluginDir, 'config', 'database', 'models', '.gitkeep'), '');
      fs.mkdirSync(path.join(ctx.pluginDir, 'config', 'settings'));

      // Files
      fs.writeFileSync(path.join(ctx.pluginDir, 'config', 'database', 'seed.jsonc'), "[\n]");
      fs.writeFileSync(path.join(ctx.pluginDir, 'config', 'settings', 'schema.jsonc'), "[\n]");
      fs.writeFileSync(path.join(ctx.pluginDir, 'config', 'settings', 'data.jsonc'), "[\n]");
    }
  }


};