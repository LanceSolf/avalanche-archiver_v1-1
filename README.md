# Avalanche Bulletin Archive

This project automatically archives avalanche bulletins from Avalanche.report for the Allgäu Alps region (DE-BY-11, DE-BY-12, DE-BY-10), starting from 2026-01-01.

## Project Structure

- `archive/`: Generated static HTML bulletin pages.
- `assets/`: Offline icons and images.
- `data/`: Raw JSON and XML data fetched from the source.
- `tools/`: Node.js scripts for fetching, building, and PDF generation.
- `index.html`: Landing page listing all archived bulletins.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

## How to Run the Archiver

The archiving process consists of two steps: fetching data and building the site.

1. **Fetch Data**: Downloads the latest bulletins (JSON/XML) and assets.
   ```bash
   node tools/fetch-assets.js
   node tools/fetch-data.js
   ```

2. **Build Site**: Generates static HTML pages from the fetched data.
   ```bash
   node tools/build.js
   ```

## How to Run the PDF Generator

To generate PDF versions of all archived HTML pages:

```bash
node tools/generate-pdf.js
```
This script uses Puppeteer to render each page and save it as a `.pdf` file in the `archive/` directory.

## How to Serve the Site Locally

You can serve the static files using a simple HTTP server. If you have Python installed:

```bash
python -m http.server
```
Then open `http://localhost:8000` in your browser.

Alternatively, use `npx serve`:
```bash
npx serve .
```

## How to Deploy to GitHub Pages

1. Initialize a git repository (if not already done).
2. Commit your changes.
3. Push to GitHub.
4. Go to your repository **Settings** -> **Pages**.
5. Select the **main** branch (or master) and root folder `/` as the source.
6. The site will be deployed at `https://<username>.github.io/<repo-name>/`.

**Note onto Automation**: You can set up a GitHub Action to run `node tools/fetch-data.js` and `node tools/build.js` daily to keep the archive up to date automatically.
