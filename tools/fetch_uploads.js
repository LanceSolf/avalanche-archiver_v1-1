const fs = require('fs');
const path = require('path');
const https = require('https');

// Configure your Worker URL here or via environment variable
const WORKER_URL = process.env.UPLOAD_WORKER_URL || 'https://avalanche-archiver-uploads.bigdoggybollock.workers.dev';

async function fetchUploads() {
    console.log(`Fetching uploads from ${WORKER_URL}...`);

    return new Promise((resolve, reject) => {
        https.get(WORKER_URL + '/list?limit=50', (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const json = JSON.parse(data);
                        resolve(json);
                    } catch (e) {
                        // If JSON parse fails, it might be an error message or html
                        reject(new Error(`Failed to parse response: ${data.substring(0, 100)}`));
                    }
                } else {
                    reject(new Error(`Worker returned status ${res.statusCode}: ${data}`));
                }
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

async function main() {
    try {
        const uploads = await fetchUploads();
        console.log(`Retrieved ${uploads.length} uploads.`);

        const dest = path.join(__dirname, '../data/uploads.json');

        // Ensure data dir exists
        const dataDir = path.dirname(dest);
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

        fs.writeFileSync(dest, JSON.stringify(uploads, null, 2));
        console.log(`Saved to ${dest}`);

    } catch (e) {
        console.warn('Failed to fetch uploads, using existing data if available.');
        console.error(e.message);
        // Don't exit with error to avoid breaking the build, just log warning
    }
}

main();
