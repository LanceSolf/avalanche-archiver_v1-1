const fs = require('fs');
const path = require('path');
const { PATHS } = require('../config');
const { generateGroundConditionsPage, generateUploadPage, generateWebcamPage, generateUserUploadDetailPage } = require('../templates');

function buildGroundConditions() {
    console.log('Building Ground Conditions...');

    const groundDir = path.join(PATHS.archive, 'ground-conditions');
    const webcamDir = path.join(PATHS.archive, 'webcams');

    fs.mkdirSync(groundDir, { recursive: true });
    fs.mkdirSync(webcamDir, { recursive: true });

    // 1. Load Data
    // Webcams
    let webcams = [];
    try {
        const webcamFile = path.join(PATHS.data, 'webcams.json');
        if (fs.existsSync(webcamFile)) {
            webcams = JSON.parse(fs.readFileSync(webcamFile, 'utf8'));
        }
    } catch (e) { console.error('Error loading webcams.json', e); }

    // Uploads
    let uploads = [];
    try {
        const uploadFile = path.join(PATHS.data, 'uploads.json');
        if (fs.existsSync(uploadFile)) {
            uploads = JSON.parse(fs.readFileSync(uploadFile, 'utf8'));
        }
    } catch (e) { console.error('Error loading uploads.json', e); }

    // Filter uploads (last 7 days)
    const now = new Date();
    const recentUploads = uploads.filter(u => {
        const d = new Date(u.date);
        const diff = (now - d) / (1000 * 60 * 60 * 24);
        return diff <= 7;
    });

    // Sort by date desc
    recentUploads.sort((a, b) => new Date(b.date) - new Date(a.date));

    // 2. Generate Index Page (Ground Conditions Hub)
    const indexHtml = generateGroundConditionsPage({
        uploads: recentUploads,
        webcamCount: webcams.length
    });
    fs.writeFileSync(path.join(groundDir, 'index.html'), indexHtml);

    // 3. Generate Upload Form Page
    const uploadHtml = generateUploadPage();
    fs.writeFileSync(path.join(groundDir, 'upload.html'), uploadHtml);

    // 4. Generate Webcam Page
    const webcamHtml = generateWebcamPage(webcams);
    fs.writeFileSync(path.join(webcamDir, 'index.html'), webcamHtml);

    // 5. Generate Individual User Upload Pages
    // Create a 'uploads' subdir in 'ground-conditions' or 'incidents'?
    // The prompt says "html pages of user uploads ... curated by date and deleted after 7 days"
    const userUploadsDir = path.join(groundDir, 'uploads');

    // Clean old pages first? (Optional, but good for "deleted after 7 days" if we relied on file existence)
    // Since we rebuild from scratch into 'archive', we don't need to delete, just don't build them.
    fs.mkdirSync(userUploadsDir, { recursive: true });

    recentUploads.forEach(u => {
        const safeId = u.id || new Date(u.date).getTime();
        const detailHtml = generateUserUploadDetailPage(u);
        fs.writeFileSync(path.join(userUploadsDir, `${safeId}.html`), detailHtml);
    });

    console.log('Ground Conditions build complete.');
}

module.exports = { buildGroundConditions };
