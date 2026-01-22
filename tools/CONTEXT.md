# Tools Directory Context

## Overview
This directory is the **Engine Room** of the project. It contains all the scripts used to fetch data and build the static website.

## Key Scripts

### Data Fetchers
- **`fetch_daily.js`**: The core cron-job. Iterates through configured regions (in `lib/config.js`) and fetches the daily avalanche bulletin (PDF) and JSON metadata.
- **`fetch_lawis_incidents.js`**: Scrapes lawis.at for avalanche incidents, details, and images.
- **`fetch_weather_report.js`**: Fetches weather data from mountain stations.
- **`fetch_geosphere.js`**: (Likely) fetches data from Geosphere Austria.
- **`process_profiles.js`**: Fetches snow profiles.
- **`fetch_uploads.js`**: Fetches user-submitted observations from the Cloudflare Worker API.

### Static Site Generator
- **`build.js`**: The main build orchestration script (`npm run build`).
    - It calls specific builders located in `lib/builders/`.
    - Generates the entire `archive/` directory structure.

## Libraries (`tools/lib/`)
- **`config.js`**: Central configuration for regions, IDs, URLs, and file paths.
- **`utils.js`**: Helper functions (date formatting, logging).
- **`pdf_fetcher.js`**: Logic for determining correct PDF URLs.
- **`templates.js`**: Shared HTML templates for generating pages (Incidents, Weather, etc.). Contains embedded Leaflet logic for inline maps (Uploads, Webcams) ensuring consistent visual style with the main map.
- **`map.html`**: The standalone map template used for the Profiles and Incidents detailed map view. Implements the core hybrid OpenStreetMap/OpenTopoMap switching logic.
- **`builders/`**: Contains the logic to generate HTML for each section (Weather, Incidents, etc.).
