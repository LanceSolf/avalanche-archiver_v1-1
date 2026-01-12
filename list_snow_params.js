const fs = require('fs');
const data = JSON.parse(fs.readFileSync('klima_metadata.json', 'utf8'));

if (data.parameters) {
    const snowParams = data.parameters.filter(p =>
        (p.name && p.name.toLowerCase().includes('schnee')) ||
        (p.desc && p.desc.toLowerCase().includes('schnee'))
    );
    snowParams.forEach(p => console.log(`${p.name}: ${p.desc} (${p.unit})`));
}
