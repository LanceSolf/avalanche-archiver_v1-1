const fs = require('fs');
const path = require('path');
const https = require('https');

const assetsDir = path.join(__dirname, '../assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

const assets = [
    'https://avalanche.report/images/pro/avalanche-problems/new_snow.webp',
    'https://avalanche.report/images/pro/avalanche-problems/wind_slab.webp',
    'https://avalanche.report/images/pro/avalanche-problems/persistent_weak_layers.webp',
    'https://avalanche.report/images/pro/avalanche-problems/wet_snow.webp',
    'https://avalanche.report/images/pro/avalanche-problems/gliding_snow.webp',
    'https://avalanche.report/images/pro/warning-pictos/levels_above.webp',
    'https://avalanche.report/images/pro/warning-pictos/levels_below.webp'
];

async function download(url) {
    const filename = path.basename(url);
    const filepath = path.join(assetsDir, filename);
    const file = fs.createWriteStream(filepath);

    console.log(`Downloading ${url}...`);
    
    return new Promise((resolve, reject) => {
        https.get(url, response => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log(`Saved to ${filepath}`);
                resolve();
            });
        }).on('error', err => {
            fs.unlink(filepath, () => {});
            reject(err);
        });
    });
}

(async () => {
    for (const url of assets) {
        try {
            await download(url);
        } catch (e) {
            console.error(`Failed to download ${url}:`, e);
        }
    }
})();
