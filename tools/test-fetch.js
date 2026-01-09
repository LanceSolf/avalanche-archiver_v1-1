const https = require('https');

const url = 'https://static.lawinen-warnung.eu/bulletins/2026-01-09/2026-01-09_DE-BY_en_CAAMLv6.json';
console.log('Testing ' + url);
https.get(url, (res) => {
    console.log('Status:', res.statusCode);
});
