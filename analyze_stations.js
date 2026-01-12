const fs = require('fs');

const data = JSON.parse(fs.readFileSync('geosphere_metadata.json', 'utf8'));
const stations = data.stations;
const globalParams = data.parameters || [];
const hasGlobalHS = globalParams.find(p => p.name === 'HS');
if (hasGlobalHS) {
    console.log('HS (Snow Depth) is a supported parameter in this dataset.');
} else {
    console.log('WARNING: HS is NOT in global parameters list.');
}

// Allgäu Alps Bounding Box (approx)
const MIN_LAT = 47.15;
const MAX_LAT = 47.7;
const MIN_LON = 9.7;
const MAX_LON = 10.9;

const relevantStations = stations.filter(s => {
    const lat = s.lat;
    const lon = s.lon;
    const isInside = lat >= MIN_LAT && lat <= MAX_LAT && lon >= MIN_LON && lon <= MAX_LON;

    // Check for "state"
    // We want Vorarlberg and Tyrol (Tirol)
    const isTargetState = s.state === 'Tirol' || s.state === 'Vorarlberg';

    return isInside && isTargetState;
});

console.log(`Found ${relevantStations.length} candidate stations.`);
relevantStations.forEach(s => {
    console.log(`${s.name} (ID: ${s.id}) - ${s.state} - Elev: ${s.altitude}m`);
});
