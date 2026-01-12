const fs = require('fs');
const data = JSON.parse(fs.readFileSync('geosphere_metadata.json', 'utf8'));
if (data.stations && data.stations.length > 0) {
    console.log('Station Keys:', Object.keys(data.stations[0]));
    // Print first item of 'parameters' array if it exists
    /*
    if (data.stations[0].parameters) {
        console.log('Parameters sample:', JSON.stringify(data.stations[0].parameters[0], null, 2));
    }
    */
    // Actually let's just print the whole first object but limit depth/length
    console.log(JSON.stringify(data.stations[0], null, 2).substring(0, 1000));
}
