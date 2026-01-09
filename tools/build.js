const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data');
const archiveDir = path.join(__dirname, '../archive');
const outputDir = path.join(__dirname, '..');

if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });

const TARGET_REGIONS = ['DE-BY-11', 'DE-BY-12', 'DE-BY-10'];

// Helper to generate Compass Rose SVG
function generateCompass(aspects) {
    const sectors = [
        { id: 'N', d: 'M50,50 L50,10 A40,40 0 0,1 78.28,18.28 L50,50 Z', rot: 0 },
        { id: 'NE', d: 'M50,50 L78.28,18.28 A40,40 0 0,1 90,50 L50,50 Z', rot: 0 },
        { id: 'E', d: 'M50,50 L90,50 A40,40 0 0,1 78.28,81.72 L50,50 Z', rot: 0 },
        { id: 'SE', d: 'M50,50 L78.28,81.72 A40,40 0 0,1 50,90 L50,50 Z', rot: 0 },
        { id: 'S', d: 'M50,50 L50,90 A40,40 0 0,1 21.72,81.72 L50,50 Z', rot: 0 },
        { id: 'SW', d: 'M50,50 L21.72,81.72 A40,40 0 0,1 10,50 L50,50 Z', rot: 0 },
        { id: 'W', d: 'M50,50 L10,50 A40,40 0 0,1 21.72,18.28 L50,50 Z', rot: 0 },
        { id: 'NW', d: 'M50,50 L21.72,18.28 A40,40 0 0,1 50,10 L50,50 Z', rot: 0 }
    ];

    // N is 0 deg. Rotate logic might be needed if paths weren't pre-calced. 
    // Wait, the paths above are manually approximated for 8 sectors.
    // N (0-45?) Actually simpler: 8 slices of 45 degrees.
    // Let's use simple paths or strict sectors.
    // Normalized: N centered at top? 
    // Standard caaml: N, NE, E, SE, S, SW, W, NW.
    // My paths above: N (top-rightish?), let's refine.
    // Sector size = 45deg.
    // N: -22.5 to +22.5 deg.

    // Simpler approach: 8 polygons.

    let svg = `<svg viewBox="0 0 100 100" class="compass-svg" width="60" height="60">`;
    svg += `<circle cx="50" cy="50" r="48" fill="#fff" stroke="#ccc" stroke-width="1"/>`;

    const aspectSet = new Set(aspects);
    const order = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

    order.forEach((dir, i) => {
        const startAngle = i * 45 - 22.5;
        const endAngle = startAngle + 45;

        // Convert polar to cartesian
        const r = 45;
        const x1 = 50 + r * Math.sin(startAngle * Math.PI / 180);
        const y1 = 50 - r * Math.cos(startAngle * Math.PI / 180);
        const x2 = 50 + r * Math.sin(endAngle * Math.PI / 180);
        const y2 = 50 - r * Math.cos(endAngle * Math.PI / 180);

        const path = `M50,50 L${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2} Z`;
        const active = aspectSet.has(dir) ? 'fill="#333"' : 'fill="#eee"';
        svg += `<path d="${path}" ${active} stroke="white" stroke-width="1"/>`;
    });

    svg += `</svg>`;
    return svg;
}

function renderBulletin(dateStr, content, prevDate, nextDate) {
    // 1. Find bulletin containing target regions
    let bulletin = null;
    if (content.bulletins) {
        for (const b of content.bulletins) {
            const regionIds = b.regions.map(r => r.regionID);
            if (TARGET_REGIONS.some(id => regionIds.includes(id))) {
                bulletin = b;
                break;
            }
        }
    }

    if (!bulletin) return null;

    const levelRef = {
        'low': { val: 1, color: '#CCFF66', desc: 'Low' },
        'moderate': { val: 2, color: '#FFFF00', desc: 'Moderate' },
        'considerable': { val: 3, color: '#FF9900', desc: 'Considerable' },
        'high': { val: 4, color: '#FF0000', desc: 'High' },
        'very_high': { val: 5, color: '#500000', desc: 'Very High' } // 'very_high' or 'very-high'? check json
    };

    // Danger rating
    // Usually "dangerRatings": [{"mainValue": "low", ...}]
    const rating = bulletin.dangerRatings[0];
    const dangerVal = rating.mainValue;
    const dangerInfo = levelRef[dangerVal] || { val: '?', color: '#ccc', desc: dangerVal };

    // Problems
    let problemsHtml = '';
    if (bulletin.avalancheProblems) {
        problemsHtml = bulletin.avalancheProblems.map(p => {
            const compass = generateCompass(p.aspects);
            // Elevation: usually "elevation": {"lowerBound": "treeline"}
            let elevText = '';
            if (p.elevation.lowerBound) elevText = `> ${p.elevation.lowerBound}`;
            if (p.elevation.upperBound) elevText = `< ${p.elevation.upperBound}`;

            return `
            <div class="problem-card">
                <div class="problem-icon ${p.problemType}"></div>
                <div class="problem-details">
                    <div class="problem-name">${p.problemType.replace(/_/g, ' ')}</div>
                    <div class="aspect-elevation-wrapper">
                        <div class="compass-wrapper">${compass}</div>
                        <div class="elevation-info">${elevText}</div>
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    const prevLink = prevDate ? `<a href="${prevDate}.html" class="nav-arrow">&larr;</a>` : '<span class="nav-arrow disabled">&larr;</span>';
    const nextLink = nextDate ? `<a href="${nextDate}.html" class="nav-arrow">&rarr;</a>` : '<span class="nav-arrow disabled">&rarr;</span>';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Avalanche Bulletin ${dateStr}</title>
    <link rel="stylesheet" href="../styles.css">
    <script src="../script.js" defer></script>
</head>
<body>
    <div class="container">
        <header>
            <div class="container header-content">
                <a href="../index.html" class="logo">Avalanche Archive</a>
                <div class="date-nav">
                    ${prevLink}
                    <span>${dateStr}</span>
                    ${nextLink}
                </div>
                <div>
                   <button onclick="window.print()" style="padding: 8px 16px; background: #004481; color: white; border: none; border-radius: 4px; cursor: pointer;">Print / Save PDF</button>
                </div>
            </div>
        </header>

        <main>
            <div class="bulletin-card">
                <div class="bulletin-header">
                     <h2 class="region-title">Allgäu Alps</h2>
                     <p>Valid: ${new Date(bulletin.validTime.startTime).toLocaleString()} - ${new Date(bulletin.validTime.endTime).toLocaleString()}</p>
                </div>
                
                <div class="danger-section">
                    <div class="danger-level-bar level-${dangerInfo.val}"></div>
                    <div class="danger-content">
                        <div class="danger-title">
                            Level ${dangerInfo.val} - ${dangerInfo.desc}
                        </div>
                        
                        <!-- Problems -->
                        <div class="problems-grid">
                            ${problemsHtml}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Text Sections -->
            <div class="text-section">
                <h3>Avalanche Danger</h3>
                <div class="highlight-box">
                    ${bulletin.avalancheActivity.highlights}
                </div>
                <p>${bulletin.avalancheActivity.comment}</p>
            </div>

            <div class="text-section">
                <h3>Snowpack Structure</h3>
                <p>${bulletin.snowpackStructure.comment}</p>
            </div>
            
            <div class="text-section">
                <h3>Tendency</h3>
                <p>${bulletin.tendency?.[0]?.highlights || ''}</p>
            </div>
        </main>

        <footer>
            <p>Archived data from Avalanche.report</p>
        </footer>
    </div>
</body>
</html>`;
    return html;
}

// MAIN EXECUTION
(async () => {
    const files = fs.readdirSync(dataDir).filter(f => f.startsWith('DE-BY') && f.endsWith('.json'));
    const dates = files.map(f => f.replace('DE-BY_', '').replace('.json', '')).sort();

    const indexData = [];

    for (let i = 0; i < dates.length; i++) {
        const dateStr = dates[i];
        const prevDate = i > 0 ? dates[i - 1] : null;
        const nextDate = i < dates.length - 1 ? dates[i + 1] : null;

        const f = `DE-BY_${dateStr}.json`;
        const content = JSON.parse(fs.readFileSync(path.join(dataDir, f), 'utf-8'));

        try {
            const html = renderBulletin(dateStr, content, prevDate, nextDate);
            if (html) {
                const outPath = path.join(archiveDir, `${dateStr}.html`);
                fs.writeFileSync(outPath, html);
                console.log(`Generated archive/${dateStr}.html`);
                indexData.push(dateStr);
            } else {
                console.log(`No matching regions found in ${f}`);
            }
        } catch (e) {
            console.error(`Error processing ${f}:`, e);
        }
    }

    // Generate Index
    const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Avalanche Bulletin Archive</title>
    <link rel="stylesheet" href="styles.css">
    <script src="script.js" defer></script>
</head>
<body>
    <div class="container">
        <header>
             <div class="header-content">
                <a href="index.html" class="logo">Avalanche Archive</a>
             </div>
        </header>

        <h1>Bulletin Archive</h1>
        <p>Archive range: ${dates[0]} to ${dates[dates.length - 1]}</p>
        <div class="archive-list">
            ${indexData.sort().reverse().map(d => `<a href="archive/${d}.html" class="archive-item">${d}</a>`).join('')}
        </div>
    </div>
</body>
</html>`;

    fs.writeFileSync(path.join(outputDir, 'index.html'), indexHtml);
    console.log('Index generated.');
})();
