const fs = require('fs');

const files = [
    'frontend/src/pages/LaporanPerjalananPage.jsx',
    'frontend/src/pages/SurveiPage.jsx',
    'backend/controllers/LaporanPerjalananController.php'
];

const replacements = {
    'Ã¢â‚¬â€': '—',
    'Ã¢â‚¬â€ ': '— ',
    'Ã¢â‚¬â€œ': '–', // en-dash
    'Ã¢â€ â‚¬': '-',
    'Ã¢Å¡Â': '?',
    'Ã‚Â·': '·',
    'Ã°Å¸â€': '??',
    'Ã°Å¸â€œ': '??',
    'Ã°Å¸â€': '??', // wait, let's look at the actual byte string
    'â€”': '—',
    'âš ': '?',
    'â”€': '-',
    'ğŸ”—': '??',
    'ğŸ“–': '??',
    'ğŸ“ ': '??',
    'â†—': '?',
    'â€¢': '•',
    'â€œ': '“',
    'â€': '”',
    'â€˜': '‘',
    'â€™': '’'
};

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    for (const [bad, good] of Object.entries(replacements)) {
        content = content.split(bad).join(good);
    }
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed ' + file);
}
