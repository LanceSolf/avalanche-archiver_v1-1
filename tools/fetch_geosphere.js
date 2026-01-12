const https = require('https');
const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, '../data/weather_stations.json');

// TAWES IDs
const STATIONS = [
    { id: '11308', name: 'Warth (1475m)', region: 'Arlberg/Außerfern', lat: 47.250000, lon: 10.183300, elevation: 1475 },
    { id: '11303', name: 'Schoppernau (839m)', region: 'Bregenzerwald', lat: 47.311389, lon: 10.017778, elevation: 839 },
    { id: '11111', name: 'Tannheim (1100m)', region: 'Tannheimer Tal', lat: 47.500389, lon: 10.505861, elevation: 1100 }
];

const DATASET = 'tawes-v1-10min';
const PARAMS = 'TL,RR,FF,DD'; // Temp, Precip, Wind Speed, Wind Dir

// Calculate dates (Last 7 days)
const today = new Date();
const endStr = today.toISOString().split('T')[0];
const start = new Date();
start.setDate(today.getDate() - 7);
const startStr = start.toISOString().split('T')[0];
// TAWES Historical requires time? Based on test, TAWES IS available via historical endpoint.
// We'll append T00:00 to be safe.
const startISO = `${startStr}T00:00:00`;
const endISO = `${endStr}T23:59:00`;

const urlParams = new URLSearchParams();
urlParams.append('start', startISO);
urlParams.append('end', endISO);
STATIONS.forEach(s => urlParams.append('station_ids', s.id));
PARAMS.split(',').forEach(p => urlParams.append('parameters', p));

const URL = `https://dataset.api.hub.geosphere.at/v1/station/historical/${DATASET}?${urlParams.toString()}`;

console.log(`Fetching Austrian Weather Data from ${URL}...`);

function fetchGeosphere() {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'User-Agent': 'AvalancheArchiver/1.0 (contact: admin@example.com)'
            }
        };
        https.get(URL, options, (res) => {
            if (res.statusCode !== 200) {
                console.error(`API Error: ${res.statusCode} ${res.statusMessage}`);
                let errData = '';
                res.on('data', c => errData += c);
                res.on('end', () => console.error('Error Details:', errData));
                resolve([]);
                return;
            }

            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (!json.features || json.features.length === 0) {
                        console.error('Empty features.');
                    }
                    resolve(json.features || []);
                } catch (e) {
                    console.error('JSON Parse Error:', e);
                    resolve([]);
                }
            });
        }).on('error', (e) => {
            console.error('Network Error:', e);
            resolve([]);
        });
    });
}

(async () => {
    const features = await fetchGeosphere();
    console.log(`Received ${features.length} station features.`);

    if (features.length === 0) {
        console.log('No data received from Geosphere.');
        return;
    }

    // Load existing weather data
    let stationData = [];
    if (fs.existsSync(OUTPUT_FILE)) {
        try {
            const raw = fs.readFileSync(OUTPUT_FILE, 'utf8');
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                stationData = parsed;
            } else if (typeof parsed === 'object') {
                // Legacy object support or empty
                stationData = Object.values(parsed);
            }
        } catch (e) {
            console.error('Error reading existing data:', e);
            throw e;
        }
    }
    console.log(`Existing stations loaded: ${stationData.length}`);

    // Convert to Map for easy update by ID/Name
    // Key: Station name (unique enough for our mix of Bavaria/Austria)
    const dataMap = new Map();
    stationData.forEach(s => {
        if (s.name) dataMap.set(s.name, s);
    });
    console.log('DEBUG: Initial Map Keys:', Array.from(dataMap.keys()));

    // Aggregate TAWES 10min data to Daily
    features.forEach((f, index) => {
        const props = f.properties;
        const sid = props.station;

        // DEBUG: Log parameters for the first station to check keys
        if (index === 0) {
            console.log(`DEBUG Params for ${sid}:`, Object.keys(props.parameters || {}));
        }

        const stationInfo = STATIONS.find(s => String(s.id) === String(sid));
        if (!stationInfo) {
            console.warn(`Skipping: Unknown station ID: ${sid}`);
            return;
        }

        const tlObj = props.parameters && props.parameters.TL;
        const rrObj = props.parameters && props.parameters.RR;
        const ffObj = props.parameters && props.parameters.FF;
        const ddObj = props.parameters && props.parameters.DD;

        const tlData = tlObj ? tlObj.data : [];
        const rrData = rrObj ? rrObj.data : [];
        const ffData = ffObj ? ffObj.data : [];
        const ddData = ddObj ? ddObj.data : [];

        if (!props.time && (!tlData || tlData.length === 0)) {
            return;
        }

        let times = [];
        if (props.time) {
            times = Array.isArray(props.time) ? props.time : [props.time];
        } else {
            // Generate times based on startISO and 10min interval
            const startDate = new Date(startISO);
            // Correct for timezone if needed, but startISO is YYYY-MM-DDT00:00:00 (Local/UTC?)
            // API interprets as UTC usually. TAWES data is UTC.
            const startMs = startDate.getTime();
            const count = tlData.length > 0 ? tlData.length : (rrData.length > 0 ? rrData.length : 0);

            for (let i = 0; i < count; i++) {
                // 10 minutes = 600,000 ms
                const t = new Date(startMs + i * 600000);
                times.push(t.toISOString());
            }
        }

        // Initialize or Update station entry
        const stationName = stationInfo.name;
        let entry = dataMap.get(stationName);
        if (!entry) {
            entry = {
                name: stationName,
                region: stationInfo.region,
                source: 'Geosphere Austria (TAWES)',
                originalUrl: 'https://data.hub.geosphere.at/dataset/tawes-v1-10min',
                lat: stationInfo.lat,
                lon: stationInfo.lon,
                elevation: stationInfo.elevation,
                data: []
            };
            dataMap.set(stationName, entry);
        } else {
            entry.region = stationInfo.region;
            entry.source = 'Geosphere Austria (TAWES)';
            entry.originalUrl = 'https://data.hub.geosphere.at/dataset/tawes-v1-10min';
            entry.lat = stationInfo.lat;
            entry.lon = stationInfo.lon;
            entry.elevation = stationInfo.elevation;
            if (!entry.data) entry.data = [];
        }

        // Populate data array (10min resolution)
        const newData = [];
        times.forEach((t, index) => {
            const tl = tlData[index];
            const rr = rrData[index];
            const ff = ffData[index];
            const dd = ddData[index];

            // Filter out empty records? Bavarian data keeps them but maybe skips nulls. 
            // We'll create the object.

            // Format TS to match roughly Bavarian or ISO. Bavarian uses "YYYY-MM-DD HH:mm:ss"
            // We'll use ISO, frontend parses with new Date(TS) which handles both.

            // TS: t (ISO string is "2024-01-05T00:00:00.000Z")
            // Skip if all main values are null
            if (tl === null && rr === null && ff === null) return;

            newData.push({
                TS: t,
                TL: tl,
                // HS: null, // Snow depth not available in TL,RR
                ff: ff,
                dd: dd,
                precip: rr
            });
        });

        // Merge/Overwrite data
        // For simplicity, we just replace the data for this window. 
        // Realistically we might want to merge, but we are fetching last 7 days.
        // Let's just set it.
        entry.data = newData;
    });

    // Write back as Array
    const keys = Array.from(dataMap.keys());
    const bavarianCount = keys.filter(k => k.includes('Hochgrat') || k.includes('Fellhorn') || k.includes('Nebelhorn') || k.includes('Schwarzenberg')).length;
    const austrianCount = keys.filter(k => k.includes('Warth') || k.includes('Tannheim') || k.includes('Reutte') || k.includes('Schoppernau')).length;
    console.log(`DEBUG: Bavarian Keys: ${bavarianCount}`);
    console.log(`DEBUG: Austrian Keys: ${austrianCount}`);

    const outputList = Array.from(dataMap.values()).filter(s => !s.name.includes('Reutte'));
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputList, null, 2));
    console.log(`Updated weather_stations.json with ${features.length} features. Total stations: ${outputList.length}`);

})();
