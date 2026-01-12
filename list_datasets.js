const fs = require('fs');
const data = JSON.parse(fs.readFileSync('datasets.json', 'utf8'));
// items or similar?
const items = Array.isArray(data) ? data : (data.datasets || data.items || []);

const candidates = items.filter(d => {
    // Check type and mode
    const type = d.type || '';
    const mode = d.mode || '';
    return type === 'station' && mode === 'historical';
});

console.log(`Found ${candidates.length} historical station datasets.`);
candidates.forEach(c => {
    console.log(`ID: ${c.resource_id} - Title: ${c.title}`);
});
