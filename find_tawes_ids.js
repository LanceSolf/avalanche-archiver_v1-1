const fs = require('fs');
try {
    const data = JSON.parse(fs.readFileSync('geosphere_metadata.json', 'utf8'));
    const stations = data.stations || [];
    const targets = ['WARTH', 'SCHOPPERNAU', 'TANNHEIM', 'HÖFEN'];

    targets.forEach(t => {
        const matches = stations.filter(s => s.name && s.name.toUpperCase().includes(t));
        matches.forEach(m => console.log(`${t} -> ${m.name} (ID: ${m.id})`));
    });
} catch (e) { console.error(e); }
