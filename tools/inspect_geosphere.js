const https = require('https');

const URL = 'https://dataset.api.hub.geosphere.at/v1/station/historical/tawes-v1-10min?parameters=TL&parameters=RR&station_ids=11111&start=2024-01-05T00:00:00&end=2024-01-06T00:00:00';

console.log('Fetching:', URL);

https.get(URL, { headers: { 'User-Agent': 'Test/1.0' } }, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        const fs = require('fs');
        const json = JSON.parse(data);
        const feat = json.features[0];
        fs.writeFileSync('geosphere_dump.json', JSON.stringify(feat, null, 2));
        console.log('Dumped to geosphere_dump.json');
    });
});
