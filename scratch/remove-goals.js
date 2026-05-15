const fs = require('fs');

let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

// Remover badges
content = content.replace(/\{renderPercentBadge\([^)]+\)\}/g, '');

// Remover barras de progresso (a div container)
const progressRegex = /<div className="mt-6 space-y-2">[\s\S]*?\{renderProgressBar\([^)]+\)\}\s*<\/div>/g;
content = content.replace(progressRegex, '');

fs.writeFileSync('src/pages/Dashboard.tsx', content);
console.log('Metas removidas com sucesso.');
