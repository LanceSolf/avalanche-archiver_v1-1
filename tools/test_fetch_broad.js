const https = require('https');

const STATION = '11308';
const START = '2026-01-11';
const END = '2026-01-11';

// Candidates
const URLS = [
    `https://dataset.api.hub.geosphere.at/v1/station/historical/klima-v1-1d?station_ids=${STATION}&start=${START}&end=${END}`,
    `https://dataset.api.hub.geosphere.at/v1/station/current/tawes-v1-10min?station_ids=${STATION}`,
    `https://dataset.api.hub.geosphere.at/v1/station/historical/tawes-v1-10min?station_ids=${STATION}&start=${START}&end=${END}`
];

URLS.forEach(url => {
    console.log(`Fetching ${url}...`);
    https.get(url, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
            if (res.statusCode === 200) {
                console.log(`SUCCESS: ${url}`);
                const json = JSON.parse(data);
                console.log(`Features found: ${json.features ? json.features.length : 0}`);
                if (json.features && json.features.length > 0) {
                    console.log('Sample keys:', Object.keys(json.features[0].properties.parameters));
                }
            } else {
                console.log(`FAILED (${res.statusCode}): ${url}`);
            }
        });
    }).on('error', e => console.error(`ERROR ${url}: ${e.message}`));
});
