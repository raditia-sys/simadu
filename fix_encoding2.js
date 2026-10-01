const fs = require('fs');

// Windows-1252 mapping for characters 128-159 (0x80 to 0x9F)
const cp1252 = {
    0x20AC: 0x80, // €
    0x81: 0x81,   // undefined
    0x201A: 0x82, // ‚
    0x0192: 0x83, // ƒ
    0x201E: 0x84, // „
    0x2026: 0x85, // …
    0x2020: 0x86, // †
    0x2021: 0x87, // ‡
    0x02C6: 0x88, // ˆ
    0x2030: 0x89, // ‰
    0x0160: 0x8A, // Š
    0x2039: 0x8B, // ‹
    0x0152: 0x8C, // Œ
    0x8D: 0x8D,
    0x017D: 0x8E, // Ž
    0x8F: 0x8F,
    0x80: 0x90,   // undefined but let's map it safely if needed. Actually 0x90 is undefined in 1252.
    0x2018: 0x91, // ‘
    0x2019: 0x92, // ’
    0x201C: 0x93, // “
    0x201D: 0x94, // ”
    0x2022: 0x95, // •
    0x2013: 0x96, // –
    0x2014: 0x97, // —
    0x02DC: 0x98, // ˜
    0x2122: 0x99, // ™
    0x0161: 0x9A, // š
    0x203A: 0x9B, // ›
    0x0153: 0x9C, // œ
    0x9D: 0x9D,   // undefined
    0x017E: 0x9E, // ž
    0x0178: 0x9F, // Ÿ
};

function fixEncoding(str) {
    const buf = Buffer.alloc(str.length);
    for (let i = 0; i < str.length; i++) {
        let code = str.charCodeAt(i);
        if (cp1252[code]) {
            buf[i] = cp1252[code];
        } else if (code <= 255) {
            buf[i] = code;
        } else {
            // Keep as is? Actually, if it's > 255 and not in cp1252, it's a real character that shouldn't be here.
            // But let's just log it.
            buf[i] = 0x3F; // ?
        }
    }
    return buf.toString('utf8');
}

const files = [
    'frontend/src/pages/LaporanPerjalananPage.jsx',
    'frontend/src/pages/SurveiPage.jsx',
    'backend/controllers/LaporanPerjalananController.php'
];

for (const file of files) {
    const str = fs.readFileSync(file, 'utf8');
    const fixed = fixEncoding(str);
    fs.writeFileSync(file, fixed, 'utf8');
    console.log('Fixed ' + file);
}
