const fs = require('fs');
const path = require('path');
const https = require('https');

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Start date: 2026-01-01
// End date: Today (2026-01-09 per system instructions)

const startDate = new Date('2026-01-01');
// Hardcoding end date for this run as per prompt metadata "The current local time is: 2026-01-09"
// In a real automated run, this would be new Date().
const endDate = new Date('2026-01-09');

function formatDate(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function fetchUrl(url, destPath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destPath);
        const req = https.get(url, (res) => {
            if (res.statusCode !== 200) {
                file.close();
                fs.unlink(destPath, () => { }); // Delete empty file
                if (res.statusCode === 404) {
                    console.log(`[MISSING] ${url}`);
                    resolve(false);
                } else {
                    reject(new Error(`Status ${res.statusCode} for ${url}`));
                }
                return;
            }
            res.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log(`[SAVED] ${destPath}`);
                resolve(true);
            });
        });
        req.on('error', (err) => {
            fs.unlink(destPath, () => { });
            reject(err);
        });
    });
}

(async () => {
    let current = new Date(startDate);
    while (current <= endDate) {
        const dateStr = formatDate(current);
        const types = [
            { name: 'EUREGIO_JSON', url: `https://static.avalanche.report/bulletins/${dateStr}/${dateStr}_EUREGIO_en_CAAMLv6.json`, dest: `EUREGIO_${dateStr}.json` },
            { name: 'EUREGIO_XML', url: `https://static.avalanche.report/bulletins/${dateStr}/${dateStr}_EUREGIO_en_CAAMLv6.xml`, dest: `EUREGIO_${dateStr}.xml` },
            { name: 'DE-BY_JSON', url: `https://static.lawinen-warnung.eu/bulletins/${dateStr}/${dateStr}_DE-BY_en_CAAMLv6.json`, dest: `DE-BY_${dateStr}.json` },
            { name: 'DE-BY_XML', url: `https://static.lawinen-warnung.eu/bulletins/${dateStr}/${dateStr}_DE-BY_en_CAAMLv6.xml`, dest: `DE-BY_${dateStr}.xml` }
        ];

        console.log(`Processing ${dateStr}...`);

        for (const type of types) {
            const destPath = path.join(dataDir, type.dest);
            if (fs.existsSync(destPath)) {
                console.log(`[SKIP] ${type.dest} exists.`);
                continue;
            }
            try {
                // Try fetching. If 404, we just log it.
                await fetchUrl(type.url, destPath);
            } catch (err) {
                console.error(`[ERROR] ${type.name} for ${dateStr}:`, err.message);
            }
        }

        // Next day
        current.setDate(current.getDate() + 1);
    }
})();
