const https = require('https');
const fs = require('fs');
const path = require('path');

const DATASET = 'tawes-v1-10min';
const PARAMS = 'TL,RR';
const STATIONS = ['11308', '11303', '11111', '11314'];
const today = new Date().toISOString().split('T')[0];
const startISO = `${today}T00:00:00`;
const endISO = `${today}T23:59:00`;
const URL = `https://dataset.api.hub.geosphere.at/v1/station/historical/${DATASET}?parameters=${PARAMS}&station_ids=${STATIONS.join(',')}&start=${startISO}&end=${endISO}`;

const OUT_FILE = path.join(__dirname, '../data/debug_weather.json');

console.log('Testing URL:', URL);

https.get(URL, { headers: { 'User-Agent': 'TestScript/1.0' } }, res => {
    console.log('Status:', res.statusCode);
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log('Features count:', json.features ? json.features.length : 'No features');
            fs.writeFileSync(OUT_FILE, JSON.stringify(json, null, 2));
            console.log('Wrote file to', OUT_FILE);
        } catch (e) {
            console.error('Error:', e);
        }
    });
}).on('error', e => console.error('Net error:', e));
