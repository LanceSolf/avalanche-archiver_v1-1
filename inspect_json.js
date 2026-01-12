const fs = require('fs');
try {
    const data = fs.readFileSync('geosphere_metadata.json'); // Read as buffer
    console.log('File size:', data.length);
    console.log('First 200 chars:', data.subarray(0, 200).toString('utf8'));
} catch (e) {
    console.error(e);
}
