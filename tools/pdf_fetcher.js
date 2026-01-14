const fs = require('fs');
const path = require('path');
const { downloadImage } = require('./lib/utils'); // Using downloadImage as generic file downloader
const { REGION_PDF_MAP, PATHS } = require('./lib/config');

// Using downloadImage from utils which handles generic file download
const downloadPdf = downloadImage;

// sourceType: 'lawinen-warnung' (Bavaria/Vorarlberg) or 'avalanche-report' (Tyrol/Euregio)
async function processBulletinForPdfs(bulletin, dateStr, sourceType = 'lawinen-warnung') {
    if (!bulletin.regions) return;

    // Check if this bulletin contains any of our target regions
    const regions = bulletin.regions.map(r => (typeof r === 'string' ? r : r.regionID));

    const matchedSlugs = [];
    for (const rid of regions) {
        if (REGION_PDF_MAP[rid]) {
            matchedSlugs.push(REGION_PDF_MAP[rid]);
        }
    }

    const uuid = bulletin.id || bulletin.bulletinID;

    if (matchedSlugs.length > 0 && uuid) {
        let url;
        if (sourceType === 'lawinen-warnung') {
            // Bavaria (DE-BY) and Vorarlberg (AT-08)
            // Determine region param based on the matched region code
            // Default to DE-BY, switch to AT-08 if the region ID starts with AT-08

            const isAt08 = regions.some(r => r.startsWith('AT-08'));
            const regionParam = isAt08 ? 'AT-08' : 'DE-BY';

            url = `https://admin.lawinen-warnung.eu/albina/api/bulletins/${uuid}/pdf?region=${regionParam}&lang=en&grayscale=false`;
        } else {
            // Tyrol (AT-07) / Euregio
            url = `https://api.avalanche.report/albina/api/bulletins/${uuid}/pdf?region=EUREGIO&lang=en&grayscale=false`;
        }

        console.log(`Found relevant bulletin ${uuid} for regions: ${matchedSlugs.join(', ')}`);
        console.log(`PDF URL: ${url}`);

        for (const slug of matchedSlugs) {
            // Base filename: YYYY-MM-DD.pdf
            const baseDest = path.join(PATHS.pdfs, slug, `${dateStr}.pdf`);

            // If file doesn't exist, simple download
            if (!fs.existsSync(baseDest)) {
                try {
                    console.log(`  Downloading to: ${slug}/${dateStr}.pdf`);
                    await downloadPdf(url, baseDest);
                } catch (e) {
                    console.error(`  Failed to download PDF: ${e.message}`);
                }
                continue;
            }

            // File exists - check for update
            // Download to temp file to compare
            const tempDest = baseDest + '.tmp';
            try {
                // console.log(`  Checking for updates for: ${slug}/${dateStr}.pdf`);
                await downloadPdf(url, tempDest);

                // Compare file sizes (simple check)
                const statExisting = fs.statSync(baseDest);
                const statNew = fs.statSync(tempDest);

                let isDifferent = (statExisting.size !== statNew.size);

                if (isDifferent) {
                    // Double check with buffer comparison to be sure (avoid size-only false positives)
                    const bufBase = fs.readFileSync(baseDest);
                    const bufNewBase = fs.readFileSync(tempDest);
                    if (bufBase.equals(bufNewBase)) {
                        console.log(`  Update matches existing ${dateStr}.pdf (content check). Skipping.`);
                        isDifferent = false;
                    }
                }

                if (isDifferent) {
                    console.log(`  Update detected for ${slug}/${dateStr}.pdf!`);

                    let suffix = '_v2';
                    if (bulletin.publicationTime) {
                        try {
                            const d = new Date(bulletin.publicationTime);
                            const y = d.getUTCFullYear();
                            const m = String(d.getUTCMonth() + 1).padStart(2, '0');
                            const day = String(d.getUTCDate()).padStart(2, '0');
                            const H = String(d.getUTCHours()).padStart(2, '0');
                            const M = String(d.getUTCMinutes()).padStart(2, '0');
                            suffix = `_${y}${m}${day}-${H}${M}`;
                        } catch (err) {
                            console.error('Error formatting publicationTime for suffix:', err);
                        }
                    }

                    let versionDest = path.join(PATHS.pdfs, slug, `${dateStr}${suffix}.pdf`);

                    // Check if this specific version already exists
                    if (fs.existsSync(versionDest)) {
                        const bufExisting = fs.readFileSync(versionDest);
                        const bufNew = fs.readFileSync(tempDest);
                        if (bufExisting.equals(bufNew)) {
                            console.log(`  Update matches existing ${dateStr}${suffix}.pdf. Skipping.`);
                            isDifferent = false;
                        } else {
                            // Same timestamp but different content? Extremely rare. 
                            // Fallback to appending v2 to the timestamp
                            suffix += '_v2';
                            versionDest = path.join(PATHS.pdfs, slug, `${dateStr}${suffix}.pdf`);
                        }
                    }

                    if (isDifferent) {
                        fs.renameSync(tempDest, versionDest);
                        console.log(`  Archived update as: ${slug}/${dateStr}${suffix}.pdf`);
                    } else {
                        // Was duplicate
                        fs.unlinkSync(tempDest);
                    }
                } else {
                    // console.log(`  No change for ${slug}/${dateStr}.pdf`);
                    fs.unlinkSync(tempDest);
                }

            } catch (e) {
                console.error(`  Failed to check update: ${e.message}`);
                // Cleanup temp if exists
                if (fs.existsSync(tempDest)) {
                    fs.unlinkSync(tempDest);
                }
            }
        }
    }
}

module.exports = { processBulletinForPdfs };
