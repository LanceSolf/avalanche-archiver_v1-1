const fs = require('fs');
const path = require('path');
const { PATHS } = require('./lib/config');
const { buildPdfArchive } = require('./lib/builders/buildPdfArchive');
const { buildWeatherPages } = require('./lib/builders/buildWeatherPages');
const { buildIncidentPages } = require('./lib/builders/buildIncidentPages');
const { buildProfilePages } = require('./lib/builders/buildProfilePages');
const { buildSnowDepth } = require('./lib/builders/buildSnowDepth');

async function main() {
    console.log('Starting build process...');
    console.log(`PATHS.archive: ${PATHS.archive}`);
    console.log(`PATHS.root: ${PATHS.root}`);

    const start = Date.now();

    try {
        console.log('Ensuring archive dir...');
        if (!fs.existsSync(PATHS.archive)) {
            fs.mkdirSync(PATHS.archive, { recursive: true });
        }
    } catch (e) {
        console.error('Error creating archive dir:', e);
    }

    try {
        console.log('Running buildWeatherPages...');
        buildWeatherPages();
    } catch (e) {
        console.error('Error in buildWeatherPages:', e);
    }

    try {
        console.log('Running buildPdfArchive...');
        buildPdfArchive();
    } catch (e) {
        console.error('Error in buildPdfArchive:', e);
    }

    try {
        console.log('Running buildIncidentPages...');
        buildIncidentPages();
    } catch (e) {
        console.error('Error in buildIncidentPages:', e);
    }

    try {
        console.log('Fetching latest uploads...');
        const { fetchUploads } = require('./fetch_uploads');
        await fetchUploads();
    } catch (e) {
        console.error('Error fetching uploads (continuing build):', e);
    }

    try {
        console.log('Running buildProfilePages...');
        buildProfilePages();
    } catch (e) {
        console.error('Error in buildProfilePages:', e);
    }

    try {
        console.log('Running buildSnowDepth...');
        buildSnowDepth();
    } catch (e) {
        console.error('Error in buildSnowDepth:', e);
    }

    try {
        const { buildGroundConditions } = require('./lib/builders/buildGroundConditions');
        console.log('Running buildGroundConditions...');
        buildGroundConditions();
    } catch (e) {
        console.error('Error in buildGroundConditions:', e);
    }

    try {
        console.log('Generating Root Index...');
        const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Avalanche Archive Root</title>
    <link rel="stylesheet" href="../styles.css">
</head>
<body>
    <div class="container">
        <header><div class="header-content"><span class="logo">Avalanche Archive</span>
        <div style="font-size: 0.7rem; color: #94a3b8; text-align: right; line-height: 1.3; font-weight: 500;">
            Updates daily @ 06:00, 14:00 & 18:00 CET.<br>
            Changes may take a few hours to appear.
        </div></div></header>
        <h1>Archive Root</h1>
        <div class="grid">
            <a href="incidents/index.html" class="card"><h2>Incidents</h2></a>
            <a href="profiles/index.html" class="card"><h2>Snow Profiles</h2></a>
            <a href="snow-depth/index.html" class="card"><h2>Snow Depth</h2></a>
             <a href="../index.html" class="card" style="background:#eee;"><h2>&larr; Main Site</h2></a>
        </div>
        
        <h2>Regions</h2>
        <div class="grid">
            ${getRegionLinks()}
        </div>
        <footer><p>Generated on ${new Date().toLocaleString()}</p></footer>
    </div>
</body>
</html>`;

        const indexDest = path.join(PATHS.archive, 'index.html');
        fs.writeFileSync(indexDest, indexHtml);
        console.log('Root index generated.');

    } catch (e) {
        console.error('Error generating root index:', e);
    }

    console.log(`Build completed in ${(Date.now() - start) / 1000}s`);
}

function getRegionLinks() {
    try {
        const { REGION_CONFIG } = require('./lib/config');
        return Object.values(REGION_CONFIG).map(r =>
            `<a href="${r.slug}/index.html" class="card"><h2>${r.label}</h2></a>`
        ).join('');
    } catch (e) {
        console.error('Error in getRegionLinks:', e);
        return '';
    }
}

main();
