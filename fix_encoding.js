const fs = require('fs');
const iconv = require('iconv-lite');

const files = [
    'frontend/src/pages/LaporanPerjalananPage.jsx',
    'frontend/src/pages/SurveiPage.jsx',
    'backend/controllers/LaporanPerjalananController.php'
];

for (const file of files) {
    const content = fs.readFileSync(file);
    // content is a Buffer containing the UTF-8 representation of the corrupted strings.
    // e.g. the byte sequence for 'â'
    
    // First, convert the UTF-8 buffer to a string
    const utf8Str = content.toString('utf8');
    
    // Now convert the string to a Buffer using windows-1252
    const cp1252Buffer = iconv.encode(utf8Str, 'win1252');
    
    // Finally, read that buffer as UTF-8
    const fixedStr = cp1252Buffer.toString('utf8');
    
    fs.writeFileSync(file + '.fixed', fixedStr, 'utf8');
    console.log('Fixed ' + file);
}
