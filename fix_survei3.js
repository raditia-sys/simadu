const fs = require('fs');

const file = 'frontend/src/pages/SurveiPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// Replace Tab Navigation logic
content = content.replace(
    /\[\s*\{\s*key:\s*'progress',\s*label:\s*'Monitoring Progres'\s*},\s*\{\s*key:\s*'petugas',\s*label:\s*'Data Petugas'\s*},\s*\{\s*key:\s*'dokumen',\s*label:\s*'Materi & Dokumen'\s*},\s*\]\.map/g,
    "[\n              { key: 'progress', label: 'Monitoring Progres' },\n              { key: 'petugas',  label: 'Data Petugas' },\n              { key: 'dokumen',  label: 'Materi & Dokumen' },\n            ].filter(t => {\n              const isSensusEkonomi = (survei?.nama_survei || '').toLowerCase().includes('sensus ekonomi') || (kategori || '').toLowerCase() === 'sensus';\n              if (isSensusEkonomi && (t.key === 'progress' || t.key === 'petugas')) return false;\n              return true;\n            }).map"
);

// Replace defaultTab logic
content = content.replace(
    /const \[tab, setTab\] = useState\(kategori === 'Sensus' \? 'dokumen' : 'progress'\);/g,
    "const defaultTab = (kategori === 'Sensus' || (surveiNama || '').toLowerCase().includes('sensus ekonomi')) ? 'dokumen' : 'progress';\n  const [tab, setTab] = useState(defaultTab);"
);

fs.writeFileSync(file, content, 'utf8');
console.log("Replaced:", content.includes('isSensusEkonomi'));
