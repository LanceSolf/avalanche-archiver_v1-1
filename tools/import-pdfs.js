const fs = require('fs');
const path = require('path');

const importDir = path.join(__dirname, '../data/pdfs_import');
const pdfsDir = path.join(__dirname, '../data/pdfs');

if (!fs.existsSync(pdfsDir)) fs.mkdirSync(pdfsDir, { recursive: true });

const REGION_MAP = {
    'kleinwalsertal': 'allgau-alps-west',
    'tannheimer-tal': 'allgau-alps-east'
};

const files = fs.readdirSync(importDir).filter(f => f.endsWith('.pdf'));

files.forEach(file => {
    // Format: YYMMDD-region.pdf
    // Example: 260101-kleinwalsertal.pdf

    const match = file.match(/^(\d{6})-(.+)\.pdf$/);
    if (match) {
        const dateRaw = match[1]; // 260101
        const regionKey = match[2]; // kleinwalsertal

        if (REGION_MAP[regionKey]) {
            const slug = REGION_MAP[regionKey];
            const year = '20' + dateRaw.substring(0, 2);
            const month = dateRaw.substring(2, 4);
            const day = dateRaw.substring(4, 6);
            const fullDate = `${year}-${month}-${day}`;

            const targetDir = path.join(pdfsDir, slug);
            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

            // Copy file
            const src = path.join(importDir, file);
            const dest = path.join(targetDir, `${fullDate}.pdf`);
            fs.copyFileSync(src, dest);
            console.log(`Imported ${file} -> ${slug}/${fullDate}.pdf`);
        } else {
            console.log(`Unknown region in file: ${file}`);
        }
    } else {
        console.log(`Skipping invalid filename: ${file}`);
    }
});
