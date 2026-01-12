const fs = require('fs');
const data = JSON.parse(fs.readFileSync('datasets.json', 'utf8'));
const items = Array.isArray(data) ? data : (data.datasets || data.items || []);

if (items.length > 0) {
    console.log('Dataset Item Keys:', Object.keys(items[0]));
    console.log('First Dataset:', JSON.stringify(items[0], null, 2));
} else {
    console.log('No items found in datasets.json.');
    console.log('Data keys:', Object.keys(data));
}
