const fs = require('fs');
const https = require('https');
const path = require('path');

const STATIONS = [
    {
        name: 'Hochgrat (1715m) / Hörmoos (1300m)',
        id: '7',
        apiUrl: 'https://api-la-dok.bayern.de/public/weatherWeb/7',
        originalUrl: 'https://lawinenwarndienst.bayern.de/schnee-wetter-bayern/automatische-wetter-schnee-messstation/?weatherid=7',
        lat: 47.493444,
        lon: 10.073861,
        elevation: 1720
    },
    {
        name: 'Fellhorn (1967m)',
        id: '8',
        apiUrl: 'https://api-la-dok.bayern.de/public/weatherWeb/8',
        originalUrl: 'https://lawinenwarndienst.bayern.de/schnee-wetter-bayern/automatische-wetter-schnee-messstation/?weatherid=8',
        lat: 47.340806,
        lon: 10.22425,
        elevation: 1960
    },
    {
        name: 'Nebelhorn (2075m)',
        id: '4',
        apiUrl: 'https://api-la-dok.bayern.de/public/weatherWeb/4',
        originalUrl: 'https://lawinenwarndienst.bayern.de/schnee-wetter-bayern/automatische-wetter-schnee-messstation/?weatherid=4',
        lat: 47.420889,
        lon: 10.351056,
        elevation: 2220
    },
    {
        name: 'Schwarzenberg (1172m)',
        id: '19',
        apiUrl: 'https://api-la-dok.bayern.de/public/weatherWeb/19',
        originalUrl: 'https://lawinenwarndienst.bayern.de/schnee-wetter-bayern/automatische-wetter-schnee-messstation/?weatherid=19',
        lat: 47.427834,
        lon: 10.409694,
        elevation: 1355
    }
];

const OUTPUT_FILE = path.join(__dirname, '../data/weather_stations.json');

const fetchStationData = (url) => {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'User-Agent': 'AvalancheArchiver/1.0 (contact: admin@example.com)'
            },
            timeout: 10000 // 10s timeout
        };
        const req = https.get(url, options, (res) => {
            if (res.statusCode !== 200) {
                res.resume(); // Consume response to free memory
                reject(new Error(`Status Code: ${res.statusCode}`));
                return;
            }
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request Timeout'));
        });
    });
};

const main = async () => {
    console.log('Fetching weather station data...');
    try {
        let existingData = [];
        if (fs.existsSync(OUTPUT_FILE)) {
            try {
                existingData = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
            } catch (e) {
                console.warn('Could not read existing data, starting fresh.');
            }
        }

        const results = await Promise.all(STATIONS.map(async (station) => {
            console.log(`Fetching ${station.name}...`);
            try {
                const newData = await fetchStationData(station.apiUrl);

                // Find existing station data to merge with
                const existingStation = existingData.find(s => s.id === station.id) || { data: [] };

                // Merge arrays: create a map of TS -> entry to deduplicate
                const mergedMap = new Map();

                // Add existing data
                existingStation.data.forEach(item => mergedMap.set(item.TS, item));

                // Add/Overwrite with new data
                newData.forEach(item => mergedMap.set(item.TS, item));

                // Convert back to array and sort
                const allData = Array.from(mergedMap.values()).sort((a, b) => new Date(a.TS) - new Date(b.TS));

                // The API returns data in 10-minute intervals. 
                // 6 points/hour * 24 hours * 7 days = 1008 points.
                // Keeping 1100 to ensure we cover full 7 days.
                const recentData = allData.slice(-1100);

                return {
                    ...station,
                    lastUpdated: new Date().toISOString(),
                    data: recentData
                };
            } catch (error) {
                console.error(`Failed to fetch ${station.name}:`, error.message);
                // Return existing data if fetch fails
                const existingStation = existingData.find(s => s.id === station.id);
                return existingStation || {
                    ...station,
                    error: error.message,
                    data: []
                };
            }
        }));

        // Merge results into existingData preserving other stations
        const finalStationsMap = new Map();

        // 1. Add all existing stations to map
        existingData.forEach(s => {
            if (s.name) finalStationsMap.set(s.name, s);
        });

        // 2. Overwrite/Add updated Bavarian stations
        results.forEach(r => {
            finalStationsMap.set(r.name, r);
        });

        const outputList = Array.from(finalStationsMap.values());
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputList, null, 2));
        console.log(`Successfully wrote data to ${OUTPUT_FILE}`);

    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
};

main();
