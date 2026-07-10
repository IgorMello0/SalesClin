const fs = require('fs');
const content = fs.readFileSync('src/pages/SalesFunnel.tsx', 'utf8');
let lines = content.split('\n');
let start = lines.findIndex(l => l.includes('<DialogContent className="sm:max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden rounded-none sm:rounded-3xl border-0 sm:border sm:border-slate-100 bg-white p-0 flex flex-col w-full h-full sm:h-[85vh]">'));
let end = lines.findIndex((l, i) => i > start && l.includes('</DialogContent>'));
let snippet = lines.slice(start, end + 1).join('\n');
fs.writeFileSync('modal_old.tsx', snippet);
