const fs = require('fs');

const file = 'frontend/src/pages/SurveiPage.jsx';
let content = fs.readFileSync(file, 'utf8');

const searchTab = "          {/* -- Tab Navigation ----------------------------------------------- */}\n          <div className=\"flex items-center gap-0.5 border-b border-border-soft dark:border-dark-border-soft\">\n            {[\n              { key: 'progress', label: 'Monitoring Progres' },\n              { key: 'petugas',  label: 'Data Petugas' },\n              { key: 'dokumen',  label: 'Materi & Dokumen' },\n            ].map(({ key, label }) => (";

const replaceTab = "          {/* -- Tab Navigation ----------------------------------------------- */}\n          <div className=\"flex items-center gap-0.5 border-b border-border-soft dark:border-dark-border-soft\">\n            {[\n              { key: 'progress', label: 'Monitoring Progres' },\n              { key: 'petugas',  label: 'Data Petugas' },\n              { key: 'dokumen',  label: 'Materi & Dokumen' },\n            ].filter(t => {\n              const isSensusEkonomi = (survei?.nama_survei || '').toLowerCase().includes('sensus ekonomi') || (kategori || '').toLowerCase() === 'sensus';\n              if (isSensusEkonomi && (t.key === 'progress' || t.key === 'petugas')) return false;\n              return true;\n            }).map(({ key, label }) => (";

const searchActive = "  // -- Tab aktif -------------------------------------------\n  const [tab, setTab] = useState(kategori === 'Sensus' ? 'dokumen' : 'progress'); // 'progress' | 'petugas' | 'dokumen'";

const replaceActive = "  // -- Tab aktif -------------------------------------------\n  const defaultTab = (kategori === 'Sensus' || (surveiNama || '').toLowerCase().includes('sensus ekonomi')) ? 'dokumen' : 'progress';\n  const [tab, setTab] = useState(defaultTab); // 'progress' | 'petugas' | 'dokumen'";

if (content.includes("kategori === 'Sensus' ? 'dokumen' : 'progress'")) {
    content = content.replace(searchActive, replaceActive);
    content = content.replace(searchTab, replaceTab);
    fs.writeFileSync(file, content, 'utf8');
    console.log("SurveiPage.jsx updated successfully.");
} else {
    console.log("Could not find the target strings in SurveiPage.jsx!");
}
