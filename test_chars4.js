const fs = require('fs');
const content = fs.readFileSync('frontend/src/pages/SurveiPage.jsx', 'utf8');
console.log("charCodeAt(0):", content.charCodeAt(0).toString(16));
