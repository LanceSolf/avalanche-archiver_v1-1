const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const archiveDir = path.join(__dirname, '../archive');

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            if (file.match(/^\d{4}-\d{2}-\d{2}\.html$/)) {
                arrayOfFiles.push(path.join(dirPath, "/", file));
            }
        }
    });

    return arrayOfFiles;
}

(async () => {
    if (!fs.existsSync(archiveDir)) {
        console.log('Archive directory not found.');
        return;
    }

    const files = getAllFiles(archiveDir);

    if (files.length === 0) {
        console.log('No bulletin HTML files to archive.');
        return;
    }

    console.log(`Found ${files.length} bulletins to process.`);
    const browser = await puppeteer.launch();

    for (const htmlPath of files) {
        // Check if PDF already exists to avoid re-work (optional, but good for speed)
        const pdfPath = htmlPath.replace('.html', '.pdf');
        // Uncomment to skip existing
        // if (fs.existsSync(pdfPath)) continue;

        const page = await browser.newPage();
        const url = `file://${htmlPath}`;

        console.log(`Generating PDF for ${path.basename(htmlPath)}...`);
        try {
            await page.goto(url, { waitUntil: 'networkidle0' });
            await page.pdf({ path: pdfPath, format: 'A4', printBackground: true });
        } catch (e) {
            console.error(`Failed to generate PDF for ${htmlPath}:`, e);
        }

        await page.close();
    }

    await browser.close();
    console.log('PDF generation complete.');
})();
