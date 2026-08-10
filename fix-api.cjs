const fs = require('fs');
let content = fs.readFileSync('src/lib/api.ts', 'utf8');
content = content.replace(/\(\/cadence\/\s*\+\s*stageCode\)/g, "('/cadence/' + stageCode)");
fs.writeFileSync('src/lib/api.ts', content);
