const { parse, compileTemplate } = require('@vue/compiler-sfc');
const babel = require('@babel/core');
const { exec, spawn } = require('child_process');
const fs = require("fs-extra");
const path = require("path");
const rootDir = process.cwd();

function deleteEntryJsFile(ctx) {
  const entryJsFile = path.join(ctx.pluginDir, ".cache", "build", "partials_entry.js");
  if (fs.existsSync(entryJsFile)) {
    fs.unlinkSync(entryJsFile);
  }
}

function createBuildFolder(ctx, partials) {
  // const adminUIFolder = path.join(__dirname, "..", "plugins", pluginKey, "adminUi", "partials");
  const adminUIFolder = path.join(ctx.pluginDir, "adminUI");
  const buildFolder = path.join(ctx.pluginDir, ".cache", "build");
  const entryJsFile = path.join(buildFolder, "partials_entry.js");

  // Create the `dist` and `build` folders if it doesn't exist
  if (!fs.existsSync(path.join(ctx.pluginDir, ".cache", "dist"))) {
    fs.mkdirSync(path.join(ctx.pluginDir, ".cache", "dist"));
  }
  if (!fs.existsSync(path.join(ctx.pluginDir, ".cache", "build"))) {
    fs.mkdirSync(path.join(ctx.pluginDir, ".cache", "build"));
  }

  // Copy `partials` folder to `build` folder
  fs.copySync(path.join(adminUIFolder, "partials"), path.join(buildFolder, "partials"));
  fs.copySync(path.join(adminUIFolder, "components"), path.join(buildFolder, "components"));

  // Replace all `@P/` with `/api/plugins_static/${ctx.pluginKey}/` in all `partials` and `components` files
  const replaceInCode = (code) => {
    return code.replace(/@P\//g, `/api/plugins_static/${ctx.pluginKey}/`);
  };
  const recursiveFolderList = (folder) => {
    const files = fs.readdirSync(folder);
    files.forEach((file) => {
      const filePath = path.join(folder, file);

      if (fs.lstatSync(filePath).isDirectory()) {
        recursiveFolderList(filePath);
      }else {
        const fileCode = fs.readFileSync(filePath, "utf8");
        const newFileCode = replaceInCode(fileCode);
        fs.writeFileSync(filePath, newFileCode, "utf8");
      }
    });
  };
  recursiveFolderList(path.join(buildFolder, "partials"));
  recursiveFolderList(path.join(buildFolder, "components"));

  var vuetifyComponentsToImport = [];
  partials.forEach((partial) => {
    // Loading the required Vuetify components
    const componentCode = fs.readFileSync(path.join(buildFolder, partial.component), "utf8");
    // Search in componentCode for the Vuetify components names prefixed with "<v-" [Important: Components names could only contain upper case and lower case letters and dashes]
    // const vuetifyComponents = componentCode.match(/v-([a-z]|[A-Z]|-)+/g);
    const vuetifyComponents = (componentCode.match(/<v-([a-z]|[A-Z]|-)+/g) || []).map((vuetifyComponent) => vuetifyComponent.slice(1));
    if (vuetifyComponents) {
      vuetifyComponents.forEach((vuetifyComponent) => {
        if (!vuetifyComponentsToImport.includes(vuetifyComponent)) {
          vuetifyComponentsToImport.push(vuetifyComponent);
        }
      });
    }
  });

  
  // In vuetifyComponentsToImport add all sub components
  // (e.g. For v-btn-toggle we should add v-btn)
  // (e.g. For v-ab-cd-ef-gh we should add v-ab-cd-ef and v-ab-cd and v-ab)
  vuetifyComponentsToImport.forEach((vuetifyComponent) => {
    const vuetifyComponentParts = vuetifyComponent.split("-");
    for (let i = 1; i < vuetifyComponentParts.length; i++) {
      const vuetifyComponentPart = vuetifyComponentParts.slice(0, i).join("-");
      if (!vuetifyComponentsToImport.includes(vuetifyComponentPart)) {
        vuetifyComponentsToImport.push(vuetifyComponentPart);
      }
    }
  });

  const content = /* xjs */`
  import Vue from "vue";
  ${partials.map((cp) => `import ${cp.name} from "${path.join(buildFolder, cp.component)}";`).join("\n")}

  console.log("=============================================");
  console.log("=============================================");
  console.log("           ${ctx.pluginKey} plugin partials loaded");
  console.log("=============================================");
  console.log("=============================================");

  // Get global cache value for calling components
  const cp_cache_key = $nuxt.$store.state.plugins.components_cache_key;

  // Creating components (partials)
  const Components = {};
  ${partials.map((cp) => `Components["cpartial_"+cp_cache_key+"_${cp.name}"] = {
    ...${cp.name},
    // props: {
    //   ...(${cp.name}.props || {}),
    //   params: {
    //     type: Object,
    //     default: () => ({})
    //   },
    // },
    name: "cpartial_"+cp_cache_key+"_${cp.name}"
  }`).join(";\n")}

  // Registering components
  Object.keys(Components).forEach(name=>{
    $nuxt.$vue_instance_for_plugins.component(Components[name].name, Components[name]);
    console.log("Partial component "+Components[name].name+" is ready");
  });

  // Informing the store about the partials
  Object.keys(Components).forEach(name=>{
    $nuxt.$store.dispatch('plugins/pluginAddPartial', {
      pluginKey: '${ctx.pluginKey}',
      partialKey: Components[name].key,
      componentName: Components[name].name,
    });
    // $nuxt.$vue_instance_for_plugins.component(Components[name].name, Components[name]);
    // console.log("Partial component "+Components[name].name+" is ready");
  });

  const vuetifyComponentsToImport = ${JSON.stringify(vuetifyComponentsToImport)};

  $nuxt.$store.dispatch('plugins/pluginLoadRequiredVuetifyComponents', { vuetifyComponentsToImport, key: '${ctx.pluginKey}' }).then(() => {
    
    // $nuxt.$store.dispatch('plugins/pluginLoaded', { key: '${ctx.pluginKey}' });

  });



  export default Components;
  `;

  fs.writeFileSync(entryJsFile, content);
}

async function buildPlugin(ctx) {
  const distFolder = path.join(ctx.pluginDir, ".cache", "dist");
  const entryJsFile = path.join(ctx.pluginDir, ".cache", "build", "partials_entry.js");
  return new Promise((resolve, reject) => {
    // const packageDirectory = path.resolve(__dirname);

    // // Switch to the package directory
    // process.chdir(packageDirectory);

    // const command = `node "${require.resolve('@vue/cli-service/bin/vue-cli-service.js')}" build --target lib --name ${ctx.pluginKey} --filename ${ctx.pluginKey} ` + entryJsFile;
    // // const command = `npx vue-cli-service build --target lib --name ${ctx.pluginKey} --filename ${ctx.pluginKey} ` + entryJsFile;
    // exec(command, (error, stdout, stderr) => {
    //   if (error) {
    //     console.error(error.message);
    //     reject("Compilation error");
    //     console.log("=========================================================");
    //     console.log("=========================================================");
    //     console.log("");
    //     console.log("To reproduce the error, please run the following command:");
    //     console.log("");
    //     console.log("cd " + packageDirectory);
    //     console.log(command);
    //     console.log("");
    //     console.log("=========================================================");
    //     console.log("=========================================================");
    //     return;
    //   }
    //   if (stderr) {
    //   }
    //   // Switch back to the original directory
    //   process.chdir(originalDirectory);
    //   resolve(stdout.trim());
    // });

    const originalDirectory = process.cwd();
    const packageDirectory = path.resolve(__dirname);

    // Switch to the package directory
    process.chdir(packageDirectory);

    const command = `node "${require.resolve('@vue/cli-service/bin/vue-cli-service.js')}" build --dest "${distFolder}" --target lib --name ${ctx.pluginKey} --filename ${ctx.pluginKey} ` + entryJsFile;
    // const command = `npx vue-cli-service build --target lib --name ${ctx.pluginKey} --filename ${ctx.pluginKey} ` + entryJsFile;

    // console.log("command ++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
    // console.log(command);
    // console.log("command ++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
    const childProcess = spawn(command, {
      stdio: 'inherit',
      shell: true,
      cwd: packageDirectory,
    });

    childProcess.on('error', (error) => {
      console.error(error.message);
      process.chdir(originalDirectory);
      reject("Compilation error");
    });

    childProcess.on('exit', (code) => {
      // Switch back to the original directory
      process.chdir(originalDirectory);
      if (code === 0) {
        resolve('Compilation completed successfully');
      } else {
        reject('Compilation error : failed with exit code: ' + code);
      }
    });

  });
}

function readCompiledFiles(ctx) {
  const distFolder = path.join(ctx.pluginDir, ".cache", "dist");
  const jsFile = path.join(distFolder, `${ctx.pluginKey}.umd.min.js`);
  const cssFile = path.join(distFolder, `${ctx.pluginKey}.css`);

  const jsContent = fs.readFileSync(jsFile, "utf8");
  var cssContent = "";
  try {
    cssContent = fs.readFileSync(cssFile, "utf8");
  } catch (error) {
  }

  return {
    script: jsContent,
    style: cssContent,
  };
}

const compilePartialsVue = async (ctx, partials, options = {}) => {
  // console.log("Creating partials_entry.js file...");
  createBuildFolder(ctx, partials);
  // console.log("Building plugin...");
  const res = await buildPlugin(ctx, partials);
  if(res.includes("error")) {
    return false;
  }
  // console.log("Deleting partials_entry.js file...");
  deleteEntryJsFile(ctx);
  // console.log("Reading compiled files...");
  const compiled = readCompiledFiles(ctx, partials);
  return compiled;
};

module.exports = {
  compilePartialsVue,
};