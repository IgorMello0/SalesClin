const fs = require('fs');
const file = 'src/pages/SalesFunnel.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Update Header
content = content.replace(
  `              {/* Modern Header Profile Section */}\n              <div className="p-6 sm:p-8 bg-white border-b border-slate-100 flex flex-col gap-6">`,
  `              {/* Modern Header Profile Section (Sticky Top) */}\n              <div className="p-4 sm:p-6 bg-white border-b border-slate-100 flex flex-col gap-4 shrink-0 z-20 relative shadow-sm">`
);

// 2. Close Header and start Scrollable Body before Cards
content = content.replace(
  `                  </div>\n                </div>\n\n                {/* Middle Strip: Lead Details Cards */}\n                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">`,
  `                  </div>\n                </div>\n              </div>\n\n              {/* Scrollable Body (Cards, Notes, Timeline) */}\n              <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col bg-slate-50/30">\n                {/* Middle Strip: Lead Details Cards */}\n                <div className="p-4 sm:p-6 bg-white border-b border-slate-100 shrink-0">\n                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">`
);

// 3. Remove old body wrapper and just close the cards div
content = content.replace(
  `                  </div>\n                </div>\n              </div>\n\n              {/* Main Body: Full Width Timeline */}\n              <div className="flex-1 bg-slate-50/30 flex flex-col min-h-0 h-full">\n\n                    {/* Activity Top Action */}\n                    <div className="p-4 sm:p-8 border-b border-slate-100 bg-white/50 space-y-3 sm:space-y-4">`,
  `                  </div>\n                </div>\n                </div>\n\n                {/* Activity Top Action */}\n                <div className="p-4 sm:p-6 border-b border-slate-100 bg-white/50 space-y-3 shrink-0">`
);

// 4. Update Tabs wrapper to not be scrollable (since parent is now), and make TabList sticky
content = content.replace(
  `                    </div>\n\n                    {/* Scrollable Timeline / Proposals */}\n                    <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">\n                      <Tabs value={activeDetailsTab} onValueChange={setActiveDetailsTab} className="w-full flex-1 flex flex-col">\n                        <div className="px-4 sm:px-8 border-b border-slate-100 bg-white">`,
  `                    </div>\n\n                    {/* Timeline / Proposals Tabs */}\n                    <div className="flex-1 flex flex-col">\n                      <Tabs value={activeDetailsTab} onValueChange={setActiveDetailsTab} className="w-full flex-1 flex flex-col">\n                        <div className="px-4 sm:px-6 border-b border-slate-100 bg-white shrink-0 sticky top-0 z-10 shadow-sm">`
);

// Update some other paddings to save space
content = content.replace(
  `className="text-xl sm:text-2xl font-extrabold`,
  `className="text-lg sm:text-xl font-extrabold`
);
content = content.replace(
  `className="w-16 h-16 rounded-[1.25rem]`,
  `className="w-12 h-12 rounded-[1rem]`
);

fs.writeFileSync(file, content);
console.log('Refactoring applied!');
