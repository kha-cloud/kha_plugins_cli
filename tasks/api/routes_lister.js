const fs = require('fs');
const path = require('path');
const helpers = require('../../helpers');

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

function showRoutes(ctx, isLastError) {
  // Routes are defined in `api/routes.js`, the file should be executed and the exported array returned to be saved
  const routesFile = path.join(ctx.pluginDir, 'api', 'routes.js');

  if(!fs.existsSync(routesFile)) {
    return;
  }
  
  var routesFileContent = fs.readFileSync(routesFile, "utf8");
  routesFileContent = replaceInCode(routesFileContent, ctx);
  const routes = eval(routesFileContent);
  if(routes.length > 0) {
    helpers.log("API Routes:", "success");
    for(var i = 0; i < routes.length; i++) {
      if(routes[i].method) {
        const route = `/api/plugin_api/${ctx.pluginKey}${routes[i].route}`;
        helpers.log(`  ${routes[i].method.toUpperCase()} ${route}`, "info");
        console.log('           '+ctx.khaConfig.url+route);
      } else if(routes[i].resource) {
        helpers.log(`  Restful API [${routes[i].resource[0]}]: ${ctx.khaConfig.url}/api/pr/${routes[i].resource[1]}`, "info");
      }
      console.log('');
    }
  }
  
  if (!fs.existsSync(routesFile) || routes.length === 0) {
    console.log('No routes found');
    return;
  }
};

module.exports = showRoutes;