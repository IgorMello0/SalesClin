const fs = require('fs');

let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

// Remove renderPercentBadge
content = content.replace(/\{renderPercentBadge\([^}]+\)\}/g, '');

// Remove the mt-6 blocks that contain the progress bar
const regex = /<div className="mt-6 space-y-2">[\s\S]*?\{renderProgressBar\([\s\S]*?\}\s*<\/div>/g;
content = content.replace(regex, '');

// Remove the text of conversion percent
content = content.replace(/<p className="text-sm font-medium text-on-surface-variant mt-2">[\s\S]*?% alcançado<\/p>/g, '');
content = content.replace(/<div className="mt-4">[\s\S]*?\{renderProgressBar\([^}]+\}\s*<\/div>/g, '');

fs.writeFileSync('src/pages/Dashboard.tsx', content);
console.log('Metas removidas com segurança.');
