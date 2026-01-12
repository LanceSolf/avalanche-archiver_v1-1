const https = require('https');
const fs = require('fs');

const url = "https://dataset.api.hub.geosphere.at/v1/datasets";
const dest = "datasets.json";

console.log(`Fetching ${url}...`);
const file = fs.createWriteStream(dest);
https.get(url, (res) => {
    res.pipe(file);
    file.on('finish', () => {
        file.close();
        console.log('Done.');
    });
});
