const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

function formatToRemotePath(file_path, ctx) {
  const staticFolder = ctx.helpers.pathToLinuxFormat(path.join(ctx.pluginDir, 'static'));
  return ctx.helpers.pathToLinuxFormat(file_path).replace(staticFolder, ""); // Start with `/`
}
 
async function verifyFileChecksumWithServer(file_path, ctx) {
  const local_file_checksum = await ctx.helpers.calculateChecksum(file_path);

  const linux_file_path = formatToRemotePath(file_path, ctx);
  
  const response = await ctx.helpers.dataCaller("get", `/api/plugin_verify_file_checksum/${linux_file_path}/${local_file_checksum}`);

  if (response.changed) {
    return true;
  }
  return false;
}

async function folderFetcher(folderName, ctx) {
  var list = fs.readdirSync(folderName);
  for (const file of list) {
    const fileLocation = path.join(folderName, file);
    if (fs.lstatSync(fileLocation).isDirectory()) { // ---------------- Directory --------------------
      await folderFetcher(fileLocation, ctx);
    } else { // ------------------------------------------------------- File -------------------------
      const fileUpdatedTime = fs.statSync(fileLocation).mtime.getTime();
      // Local verification
      const isChanged = fileUpdatedTime != ctx.clientCache.get(fileLocation);
      // Server verification
      const isChecksumChanged = isChanged ? await verifyFileChecksumWithServer(fileLocation, ctx) : false;
      // Upload file
      if(isChecksumChanged == true){
        const res = await uploadFile(fileLocation, ctx);
        if(res){
          ctx.helpers.log(`File [${fileLocation}] uploaded successfully`, "info");
        }else{
          ctx.helpers.log(`File [${fileLocation}] failed to upload`, "error");
        }
      }
      if((isChanged == true) && (isChecksumChanged == false) || (isChecksumChanged == true)){ // File is changed but checksum on server is same OR checksum is changed
        ctx.clientCache.set(fileLocation, fileUpdatedTime);
      }
    }
  }
}

async function uploadFile(file_path) {
  const linux_file_path = formatToRemotePath(file_path, ctx);
  const fileChecksum = await ctx.helpers.calculateChecksum(file_path);

  const form = new FormData();
  form.append('file', fs.createReadStream(file_path));
  try {
    const result = await ctx.helpers.dataCaller(
      "post",
      `/api/plugin_upload_file/${linux_file_path}/${fileChecksum}`,
      form,
      form.getHeaders(),
    );
    if (result.success) {
      return true;
    }
    console.log(result);
    return false;
  } catch (error) {
    console.error(error);
    return false;
  }

}

module.exports = async (ctx) => {
  await folderFetcher(path.join(ctx.pluginDir, 'static'), ctx);
  // .then((_) => {
  //   return purgeCache();
  // });
}