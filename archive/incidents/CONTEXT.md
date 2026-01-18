# Incident Archive Context

## Overview
This section contains a browsable archive of avalanche incidents from the Lawinenwarndienst database (lawis.at).
It focuses on events in the Allgäu and Kleinwalsertal regions.

## Data Acquisition
- **Script**: `tools/fetch_lawis_incidents.js`
- **Source**: `https://lawis.at/lawis_api/v2_3/` (Incidents and Location APIs).
- **Process**:
    1. Fetches location data to identify "Allgäu" and "Kleinwalsertal" subregions.
    2. Queries incidents for these subregions since 2018.
    3. Fetches detailed info (comments, snowpack data).
    4. Downloads associated images to `data/incident_images/`.
    5. Attempts to translate German comments to English using Google Translate API.
    6. Stores metadata in `data/incidents.json`.

## Page Generation
- **Builder**: `tools/lib/builders/buildIncidentPages.js`
- **Output**: 
    - `index.html`: Gallery grid of all incidents.
    - `detail/[id].html`: Detailed report page for each incident.
- **Logic**:
    - Reads `data/incidents.json`.
    - Generates a card for each incident.
    - Links to the associated daily avalanche bulletin (PDF) if available in `data/pdfs` or `data/incident_bulletins`.

## Assets
- **Images**: Local copies stored/served from `data/incident_images`.
- **Bulletins**: Linked to `archive/[region]/[date].pdf` or local copies.
