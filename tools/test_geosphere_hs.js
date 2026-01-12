const https = require('https');

const STATION = '11308'; // WARTH
const PARAMS = 'HS,TL'; // Snow Depth, Air Temp
const START = '2026-01-01';
const END = '2026-01-12';
const URL = `https://dataset.api.hub.geosphere.at/v1/station/historical/tawes-v1-10min?parameters=${PARAMS}&station_ids=${STATION}&start=${START}&end=${END}`;

console.log(`Fetching ${URL}...`);

https.get(URL, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log('Response Keys:', Object.keys(json));
            if (json.features && json.features.length > 0) {
                console.log('Found features:', json.features.length);
                const props = json.features[0].properties;
                console.log('Sample Properties:', JSON.stringify(props, null, 2));
                // Check if parameters values exist
                // usually inside properties.parameters with values?
                console.log('Data sample:', JSON.stringify(json.features[0], null, 2).substring(0, 500));
            } else {
                console.log('No features found.');
                console.log(JSON.stringify(json, null, 2).substring(0, 500));
            }
        } catch (e) {
            console.error('Parse error:', e);
            console.log('Raw:', data.substring(0, 500));
        }
    });
}).on('error', console.error);
