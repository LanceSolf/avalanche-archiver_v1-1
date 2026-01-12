const https = require('https');
const fs = require('fs');

const url = "https://dataset.api.hub.geosphere.at/v1/station/historical/klima-v1-1d/metadata";
const dest = "klima_metadata.json";

console.log(`Fetching ${url}...`);
const file = fs.createWriteStream(dest);
https.get(url, (res) => {
    if (res.statusCode !== 200) {
        console.error(`Failed: ${res.statusCode}`);
        res.resume();
        return;
    }
    res.pipe(file);
    file.on('finish', () => {
        file.close();
        console.log('Done.');
    });
}).on('error', (err) => {
    console.error(`Error: ${err.message}`);
});
