const https = require('https');

const STATION = '11308'; // WARTH
const PARAMS = 'schnee,tl_max'; // schnee=Snow Depth, tl_max=Max Temp (daily)
const START = '2026-01-01';
const END = '2026-01-12';
const URL = `https://dataset.api.hub.geosphere.at/v1/station/historical/klima-v1-1d?parameters=${PARAMS}&station_ids=${STATION}&start=${START}&end=${END}`;

console.log(`Fetching ${URL}...`);

https.get(URL, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.features && json.features.length > 0) {
                console.log('SUCCESS! Found features:', json.features.length);
                const feat = json.features[0];
                console.log('Time:', feat.properties.time);
                console.log('Parameters:', JSON.stringify(feat.properties.parameters, null, 2));
            } else {
                console.log('No features found.');
                console.log('Response sample:', data.substring(0, 500));
            }
        } catch (e) {
            console.error('Parse error:', e);
            console.log('Raw:', data.substring(0, 500));
        }
    });
}).on('error', console.error);
