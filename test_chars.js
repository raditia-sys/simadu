const fs = require('fs');
const content = fs.readFileSync('frontend/src/pages/LaporanPerjalananPage.jsx', 'utf8');
const match = content.match(/<option value="">(.*?) Pilih petugas/);
if (match) {
    const bad = match[1];
    console.log("Found:", bad);
    console.log("Chars:");
    for (let i=0; i<bad.length; i++) {
        console.log(bad.charCodeAt(i).toString(16));
    }
}
