const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const archiveDir = path.join(__dirname, '../archive');

(async () => {
    const files = fs.readdirSync(archiveDir).filter(f => f.endsWith('.html'));

    if (files.length === 0) {
        console.log('No HTML files to archive.');
        return;
    }

    const browser = await puppeteer.launch();

    for (const file of files) {
        const page = await browser.newPage();
        const htmlPath = path.join(archiveDir, file);
        const url = `file://${htmlPath}`;

        console.log(`Generating PDF for ${file}...`);
        await page.goto(url, { waitUntil: 'networkidle0' });

        const pdfPath = htmlPath.replace('.html', '.pdf');
        await page.pdf({ path: pdfPath, format: 'A4', printBackground: true });

        await page.close();
    }

    await browser.close();
    console.log('PDF generation complete.');
})();
