# Snow Profile Archive Context

## Overview
This section archives snow profiles (Schneeprofile) which are technical analyses of the snowpack layers.

## Data Acquisition
- **Script**: `tools/process_profiles.js`
- **Source**: Lawis.at / Regios API.
- **Process**:
    1. Fetches recent snow profiles for relevant region IDs.
    2. Stores raw data in `data/recent_profiles.json`.
    3. `tools/enrich_profiles.js` adds metadata like elevation, aspect, and danger ratings from the day's bulletin.

## Page Generation
- **Builder**: `tools/lib/builders/buildProfilePages.js`
- **Output**:
    - `index.html`: List/Map of recent profiles.
    - Individual profile views (if applicable, usually links to external viewer or embedded graph).
- **Visualization**:
    - Profiles are often visualized using libraries (like d3.js or similar) or static images fetched from the source.
