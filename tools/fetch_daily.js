const fs = require('fs');
const https = require('https');
const path = require('path');
const { processBulletinForPdfs } = require('./pdf_fetcher');
const { formatDate, log } = require('./lib/utils');
const { SOURCES, PATHS } = require('./lib/config');

// Determine target date
// Default: Today
// Override: CLI argument (YYYY-MM-DD)
let targetDate = new Date();
if (process.argv[2]) {
    targetDate = new Date(process.argv[2]);
}

// Helper for Cache Directory
const CACHE_DIR = PATHS.bulletinCache;
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

// Stats tracking
const stats = { fetched: 0, cached: 0, pdfsNew: 0, pdfsUpdated: 0, errors: 0 };

// Helper to fetch and process a single source
async function fetchAndProcess(source, dateStr) {
    const url = source.url(dateStr);
    const dest = path.join(PATHS.data, `${source.name}_${dateStr}.json`);
    const cacheFile = path.join(CACHE_DIR, `${source.name}_${dateStr}.json`);

    log.info(`Fetching ${source.name}...`);

    return new Promise((resolve) => {
        const file = fs.createWriteStream(dest);
        const req = https.get(url, (response) => {
            if (response.statusCode === 200) {
                response.pipe(file);
                file.on('finish', () => {
                    file.close(async () => {
                        try {
                            const contentStr = fs.readFileSync(dest, 'utf-8');

                            // Check Cache
                            let isNew = true;
                            if (fs.existsSync(cacheFile)) {
                                const cacheStr = fs.readFileSync(cacheFile, 'utf-8');
                                if (contentStr === cacheStr) {
                                    log.info(`${source.name}: No changes (cached)`);
                                    stats.cached++;
                                    isNew = false;
                                }
                            }

                            if (isNew) {
                                stats.fetched++;
                                // Process PDFs
                                const content = JSON.parse(contentStr);
                                const bulletins = Array.isArray(content) ? content : content.bulletins;
                                if (bulletins) {
                                    for (const bulletin of bulletins) {
                                        const result = await processBulletinForPdfs(bulletin, dateStr, source.type);
                                        if (result === 'new') stats.pdfsNew++;
                                        if (result === 'updated') stats.pdfsUpdated++;
                                    }
                                }
                                // Update Cache
                                fs.copyFileSync(dest, cacheFile);
                                log.info(`${source.name}: Updated cache`);
                            }

                            // Cleanup JSON file
                            try {
                                fs.unlinkSync(dest);
                            } catch (cleanupErr) {
                                log.error(`Failed to delete temp JSON`, cleanupErr);
                            }

                            resolve(true);
                        } catch (e) {
                            log.error(`${source.name} processing failed`, e);
                            stats.errors++;
                            resolve(false);
                        }
                    });
                });
            } else {
                log.warn(`${source.name}: HTTP ${response.statusCode}`);
                stats.errors++;
                file.close();
                fs.unlink(dest, () => { });
                resolve(false);
            }
        });

        req.on('error', (err) => {
            log.error(`${source.name} network error`, err);
            stats.errors++;
            fs.unlink(dest, () => { });
            resolve(false);
        });
    });
}


(async () => {
    const dates = [targetDate];

    // If running automatically (no CLI arg) and it is evening (UTC Hour >= 15)
    // Include tomorrow's bulletin
    if (!process.argv[2]) {
        const utcHour = new Date().getUTCHours();
        if (utcHour >= 15) {
            const tomorrow = new Date(targetDate);
            tomorrow.setDate(tomorrow.getDate() + 1);
            dates.push(tomorrow);
            log.info(`Evening run (UTC ${utcHour}:00). Including tomorrow.`);
        }
    }

    for (const date of dates) {
        const dStr = formatDate(date);
        log.info(`=== Processing: ${dStr} ===`);

        // Parallel fetch all sources for this date
        await Promise.all(SOURCES.map(source => fetchAndProcess(source, dStr)));
    }

    // Summary
    log.info(`--- Summary ---`);
    log.info(`Sources fetched: ${stats.fetched}, cached: ${stats.cached}`);
    log.info(`PDFs new: ${stats.pdfsNew}, updated: ${stats.pdfsUpdated}`);
    if (stats.errors > 0) log.warn(`Errors: ${stats.errors}`);

    process.exit(stats.errors > 0 ? 1 : 0);
})();
