const fs = require('fs');
const content = fs.readFileSync('frontend/src/pages/LaporanPerjalananPage.jsx', 'utf8');
const match = content.match(/<option value="">(.*?) Pilih petugas/);
if (match) {
    console.log("Match:", match[1]);
    for (let i=0; i<match[1].length; i++) {
        console.log(match[1].charCodeAt(i).toString(16));
    }
}
