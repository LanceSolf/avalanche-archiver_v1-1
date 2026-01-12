const fs = require('fs');
const path = require('path');
const OUTPUT_FILE = path.join(__dirname, '../data/weather_stations.json');

console.log('Reading from:', OUTPUT_FILE);
if (fs.existsSync(OUTPUT_FILE)) {
    try {
        const raw = fs.readFileSync(OUTPUT_FILE, 'utf8');
        console.log('Read bytes:', raw.length);
        const parsed = JSON.parse(raw);
        console.log('Parsed items:', parsed.length);
    } catch (e) {
        console.error('Error:', e);
    }
} else {
    console.log('File does not exist');
}
