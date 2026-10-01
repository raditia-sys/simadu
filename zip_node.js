const fs = require('fs');
const archiver = require('archiver');

const output = fs.createWriteStream('deploy_fix.zip');
const archive = archiver('zip', {
  zlib: { level: 9 }
});

output.on('close', function() {
  console.log(archive.pointer() + ' total bytes');
  console.log('archiver has been finalized and the output file descriptor has closed.');
});

archive.pipe(output);
archive.directory('frontend/dist/', false); // false means put contents of dist in the root of the zip
archive.finalize();
