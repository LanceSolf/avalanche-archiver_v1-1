const fs = require('fs');

try {
    const data = JSON.parse(fs.readFileSync('klima_metadata.json', 'utf8'));
    const stations = data.stations || [];
    console.log(`Loaded ${stations.length} stations.`);

    const targets = ['WARTH', 'TANNHEIM', 'HÖFEN', 'SCHOPPERNAU', 'HIRSCHEGG'];

    // Find stations matching names
    const matches = stations.filter(s => targets.some(t => s.name && s.name.toUpperCase().includes(t)));
    matches.forEach(s => console.log(`MATCH: ${s.name} (ID: ${s.id}) - ${s.state}`));

    // Check HS
    const hs = data.parameters ? data.parameters.find(p => p.name === 'gam' || p.name === 'schnee' || p.desc.includes('schnee')) : null;
    if (hs) console.log(`HS Param found: ${hs.name} (${hs.desc})`);
    else {
        // List all param names to find the right one
        if (data.parameters) console.log('Params:', data.parameters.map(p => `${p.name}:${p.desc}`).join(', ').substring(0, 500));
    }

} catch (e) { console.error(e); }
