const fs = require('fs');

// Read and normalize line endings for safe matching
let modalOld = fs.readFileSync('modal_old.tsx', 'utf8').replace(/\r\n/g, '\n');
const originalFile = fs.readFileSync('src/pages/SalesFunnel.tsx', 'utf8'); // don't normalize original, keep it intact

function extractBlock(startStr, endStr) {
  let startIndex = modalOld.indexOf(startStr);
  if (startIndex === -1) throw new Error("Could not find start: " + startStr);
  let endIndex = modalOld.indexOf(endStr, startIndex);
  if (endIndex === -1) throw new Error("Could not find end: " + endStr);
  return modalOld.substring(startIndex, endIndex + endStr.length);
}

const nameLogic = extractBlock('{isEditingName ? (', ')}');
const selectsLogic = extractBlock('<Select value={selectedFunnelForEdit}', '</Select>\n                      </div>');
const actionButtons = extractBlock('<Button \n                      onClick={() => openWhatsApp(selectedLead.phone)}', 'Ligar\n                    </Button>');
const valueLogic = extractBlock('<p className="text-sm font-bold text-secondary">{selectedLead.value.toLocaleString', '</p>');
const phoneLogic = extractBlock('{isEditingPhone ? (', ')}');
const emailLogic = extractBlock('{isEditingEmail ? (', ')}');
const originLogic = extractBlock('{isEditingOrigin ? (', ')}');
const respLogic = extractBlock('<p className="text-xs font-bold text-primary truncate">{selectedLead.responsible', '</p>');

const noteInputLogic = extractBlock('<Textarea \n                          value={noteText}', 'Salvar Nota\n                          </Button>\n                        </div>');

const activitiesLogic = extractBlock('{/* The Vertical Line */}', ')}');
const proposalsLogic = extractBlock('<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">', '</div>\n                        </TabsContent>');
const tasksLogic = extractBlock('<div className="space-y-6">', '</div>\n                        </TabsContent>');

// Build new modal layout
const newModal = `        <DialogContent className="sm:max-w-6xl max-h-[95vh] sm:h-[90vh] overflow-hidden rounded-none sm:rounded-[2rem] border-0 sm:border sm:border-slate-100 bg-slate-50 p-0 flex flex-col sm:flex-row w-full shadow-2xl">
          {selectedLead && (
            <>
              {/* Left Sidebar: Fixed Width on Desktop, Scrollable */}
              <div className="w-full sm:w-80 lg:w-[400px] bg-white border-r border-slate-100 flex flex-col shrink-0 h-auto sm:h-full overflow-y-auto custom-scrollbar shadow-sm z-20">
                <div className="p-6 sm:p-8 flex flex-col gap-8">
                  
                  {/* Avatar & Name */}
                  <div className="flex flex-col items-center text-center gap-5">
                    <div className="w-24 h-24 rounded-[1.75rem] bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-4xl font-extrabold text-white shadow-xl shadow-primary/20 ring-4 ring-slate-50">
                      {selectedLead.avatar}
                    </div>
                    <div className="space-y-1 w-full flex flex-col items-center">
                      <div className="flex items-center justify-center gap-2 group/name relative w-full">
                        ${nameLogic.replace('className="text-lg sm:text-xl', 'className="text-2xl text-center').replace('className="text-xl sm:text-2xl', 'className="text-2xl text-center')}
                      </div>
                      
                      {/* Funnel and Stage */}
                      <div className="flex items-center justify-center gap-2 pt-3 w-full">
                        ${selectsLogic}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 w-full mt-2">
                    ${actionButtons.replace('h-11', 'h-12 w-full').replace('h-11', 'h-12 w-full').replace('flex-1 sm:flex-none', 'flex-1').replace('flex-1 sm:flex-none', 'flex-1')}
                  </div>

                  <hr className="border-slate-100" />

                  {/* Contact Details List */}
                  <div className="space-y-5">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Detalhes do Lead</h4>
                    
                    {/* Valor */}
                    <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-50/50 border border-slate-100/50">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Valor Estimado</p>
                      ${valueLogic}
                    </div>

                    {/* Telefone */}
                    <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-50/50 border border-slate-100/50 group/phone relative">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Telefone</p>
                      ${phoneLogic}
                    </div>
                    
                    {/* Email */}
                    <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-50/50 border border-slate-100/50 group/email relative">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">E-mail</p>
                      ${emailLogic}
                    </div>

                    {/* Origem */}
                    <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-50/50 border border-slate-100/50 group/origin relative">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Origem</p>
                      ${originLogic}
                    </div>

                    {/* Responsável */}
                    <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-50/50 border border-slate-100/50">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Responsável</p>
                      ${respLogic}
                    </div>
                  </div>

                </div>
              </div>

              {/* Right Side: Main Area (Tabs + Timeline) */}
              <div className="flex-1 flex flex-col min-w-0 h-full bg-slate-50 relative overflow-hidden">
                
                <Tabs value={activeDetailsTab} onValueChange={setActiveDetailsTab} className="flex-1 flex flex-col h-full overflow-hidden w-full">
                  
                  {/* Sticky Tabs Header */}
                  <div className="px-6 sm:px-8 border-b border-slate-200 bg-white shrink-0 z-10 sticky top-0 flex items-center h-16 shadow-sm">
                    <TabsList className="bg-transparent border-0 h-full p-0 gap-8 w-full justify-start">
                      <TabsTrigger 
                        value="activities" 
                        className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 text-xs font-bold uppercase tracking-widest text-slate-400 gap-2"
                      >
                        <History className="w-4 h-4" />
                        Atividades
                      </TabsTrigger>
                      <TabsTrigger 
                        value="proposals" 
                        className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 text-xs font-bold uppercase tracking-widest text-slate-400 gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        Propostas
                        {leadProposals.length > 0 && (
                          <span className="bg-secondary text-white text-[9px] px-1.5 py-0.5 rounded-full ml-1">
                            {leadProposals.length}
                          </span>
                        )}
                      </TabsTrigger>
                      <TabsTrigger 
                        value="tasks" 
                        className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 text-xs font-bold uppercase tracking-widest text-slate-400 gap-2"
                      >
                        <CheckSquare className="w-4 h-4" />
                        Tarefas
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {/* Scrollable Content Area */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar w-full">
                    
                    <TabsContent value="activities" className="m-0 p-0 outline-none flex flex-col min-h-full">
                      
                      {/* Notes Input Area */}
                      <div className="p-6 sm:p-8 bg-white border-b border-slate-100 space-y-4 shrink-0 shadow-[0_4px_20px_-15px_rgba(0,0,0,0.1)] z-10 relative">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Adicionar Nota Rápida</h4>
                        </div>
                        <div className="space-y-3">
                          ${noteInputLogic.replace('min-h-[80px]', 'min-h-[100px] bg-slate-50/50')}
                      </div>
                      
                      {/* Timeline */}
                      <div className="p-6 sm:p-8 flex-1 bg-slate-50/50 relative">
                        <div className="relative pl-8 space-y-12 max-w-4xl">
                          ${activitiesLogic}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="proposals" className="m-0 p-6 sm:p-8 outline-none min-h-full bg-slate-50/50">
                      ${proposalsLogic}
                    
                    <TabsContent value="tasks" className="m-0 p-6 sm:p-8 outline-none min-h-full bg-slate-50/50">
                      ${tasksLogic}

                  </div>
                </Tabs>
              </div>
            </>
          )}
        </DialogContent>`;

// Inject into file using regex to avoid whitespace issues
const originalNormalized = originalFile.replace(/\r\n/g, '\n');
let startStr = '<DialogContent className="sm:max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden rounded-none sm:rounded-3xl border-0 sm:border sm:border-slate-100 bg-white p-0 flex flex-col w-full h-full sm:h-[85vh]">';
let startIndex = originalNormalized.indexOf(startStr);
if (startIndex === -1) {
  // Try finding just <DialogContent
  startIndex = originalNormalized.indexOf('<DialogContent');
  // Need to be inside `<Dialog open={!!selectedLead}`
  let dialogStart = originalNormalized.indexOf('<Dialog open={!!selectedLead}');
  startIndex = originalNormalized.indexOf('<DialogContent', dialogStart);
}

let endIndex = originalNormalized.indexOf('</DialogContent>', startIndex);

if (startIndex === -1 || endIndex === -1) {
  throw new Error("Could not find start/end in original file");
}

const newFileContent = originalNormalized.substring(0, startIndex) + newModal + originalNormalized.substring(endIndex + '</DialogContent>'.length);
fs.writeFileSync('src/pages/SalesFunnel.tsx', newFileContent);
console.log('Successfully rebuilt modal layout!');
