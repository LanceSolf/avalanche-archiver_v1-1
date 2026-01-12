const fs = require('fs');
const data = JSON.parse(fs.readFileSync('klima_metadata.json', 'utf8'));
const stations = data.stations || [];
const targets = ['WARTH', 'SCHOPPERNAU', 'TANNHEIM', 'HÖFEN'];
const matches = stations.filter(s => targets.some(t => s.name.toUpperCase().includes(t)));
matches.forEach(s => console.log(`MATCH: ${s.name} (ID: ${s.id})`));
