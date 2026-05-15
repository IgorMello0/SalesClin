const fs = require('fs');

let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

// Remove {renderPercentBadge(...)}
content = content.replace(/\{renderPercentBadge\([^}]+\)\}/g, '');

// Remove the entire div block starting with <div className="mt-6 space-y-2"> up to </div>
// Since it contains nested divs, we can use a trick: replacing a known string.
// Let's replace the whole blocks manually if regex is too hard, but regex should work if we match until the closing of the main card div.
// Wait, the block ends with </div> just before </Card>.

content = content.replace(/<div className="mt-6 space-y-2">[\s\S]*?<\/div>\s*<\/div>\s*<\/Card>/g, '</Card>');

// Also remove conversion percent
content = content.replace(/<p className="text-sm font-medium text-on-surface-variant mt-2">[\s\S]*?% alcançado<\/p>/g, '');
content = content.replace(/<div className="mt-4">[\s\S]*?\{renderProgressBar\([^)]+\)\}\s*<\/div>/g, '');


fs.writeFileSync('src/pages/Dashboard.tsx', content);
console.log('Metas removidas.');
