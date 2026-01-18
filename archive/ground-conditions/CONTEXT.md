# Ground Conditions & User Uploads Context

## Overview
A community-driven section where users can upload observations (ground conditions, photos) and view recent submissions.

## Data Acquisition
- **Upload API**: Observations are submitted via `upload.html` (handled by server logic or external API).
- **Storage**: `data/uploads.json` stores the metadata for approved/recent uploads.
- **Retention**: Logic exists (in `buildGroundConditions.js`) to filter for "Recent" uploads (e.g., last 7 days).

## Page Generation
- **Builder**: `tools/lib/builders/buildGroundConditions.js`
- **Output**:
    - `index.html`: The "Ground Conditions Hub" listing recent uploads and webcams.
    - `upload.html`: Form for new submissions.
    - `uploads/[id].html`: Detail page for specific user observations.
