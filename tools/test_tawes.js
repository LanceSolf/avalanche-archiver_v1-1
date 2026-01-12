const https = require('https');

const STATION = '11308'; // WARTH TAWES
// TAWES params: TL (Temp), P (Pressure), etc. No HS usually.
const PARAMS = 'TL';
// Use current endpoint for simplicity, it gives last 48h usually? 
// Or historical? Try historical with date.
const START = '2026-01-11T12:00:00';
const END = '2026-01-11T13:00:00';
// TAWES often requires ISO with time?
const URL = `https://dataset.api.hub.geosphere.at/v1/station/historical/tawes-v1-10min?parameters=${PARAMS}&station_ids=${STATION}&start=${START}&end=${END}`;

console.log(`Fetching ${URL}...`);

https.get(URL, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        try {
            if (res.statusCode === 200) {
                const json = JSON.parse(data);
                if (json.features && json.features.length > 0) {
                    console.log('SUCCESS TAWES!');
                    console.log('Length:', json.features.length);
                    console.log('Sample:', JSON.stringify(json.features[0].properties.parameters, null, 2));
                } else {
                    console.log('No features TAWES.');
                }
            } else {
                console.log(`FAILED TAWES: ${res.statusCode}`);
                console.log(data.substring(0, 500));
            }
        } catch (e) { console.error(e); }
    });
});
