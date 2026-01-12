const fs = require('fs');
const data = JSON.parse(fs.readFileSync('geosphere_metadata.json', 'utf8'));
if (data.stations && data.stations.length > 0) {
    fs.writeFileSync('station_dump.json', JSON.stringify(data.stations[0], null, 2));
    console.log('Dumped first station to station_dump.json');
}
if (data.parameters) {
    console.log('Top level parameters:', JSON.stringify(data.parameters, null, 2));
}
