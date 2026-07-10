import sys

with open('src/pages/SalesFunnel.tsx', 'r', encoding='utf-8') as f:
    code = f.read().replace('\r\n', '\n')

# 1. Imports
if 'tasksApi' not in code:
    code = code.replace("import { leadsApi, professionalsApi, getImageUrl } from '@/lib/api';", "import { leadsApi, professionalsApi, getImageUrl, tasksApi } from '@/lib/api';")
    code = code.replace("import { leadsApi, professionalsApi, getImageUrl, funnelsApi } from '@/lib/api';", "import { leadsApi, professionalsApi, getImageUrl, funnelsApi, tasksApi } from '@/lib/api';")

# 2. State Variables
state_vars = """  const [activityToDeleteId, setActivityToDeleteId] = useState<string | null>(null);

  // Tasks State
  const [leadTasks, setLeadTasks] = useState<any[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [newTaskDate, setNewTaskDate] = useState("");
  const [isSavingTask, setIsSavingTask] = useState(false);"""
if 'const [leadTasks' not in code:
    code = code.replace('  const [activityToDeleteId, setActivityToDeleteId] = useState<string | null>(null);', state_vars)

# 3. useEffect loading tasks
load_proposals = """  useEffect(() => {
    if (selectedLead) {
      loadProposals(Number(selectedLead.id));
      setActiveDetailsTab("activities");
    }
  }, [selectedLead]);"""
load_proposals_new = """  useEffect(() => {
    if (selectedLead) {
      loadProposals(Number(selectedLead.id));
      loadTasks(Number(selectedLead.id));
      setActiveDetailsTab("activities");
    }
  }, [selectedLead]);

  const loadTasks = async (leadId: number) => {
    try {
      const res = await tasksApi.getAll({ leadId });
      if (res.success) {
        setLeadTasks(res.data || []);
      }
    } catch (e) {
      console.error("Error loading tasks:", e);
    }
  };

  const handleSaveTask = async () => {
    if (!newTaskTitle.trim() || !selectedLead) return;
    setIsSavingTask(true);
    try {
      const payload = {
        title: newTaskTitle,
        description: newTaskDescription,
        status: 'pending',
        priority: newTaskPriority,
        dueDate: newTaskDate || new Date().toISOString(),
        leadId: selectedLead.id,
        assignedToId: professional?.id
      };
      const res = await tasksApi.create(payload);
      if (res.success) {
        setNewTaskTitle("");
        setNewTaskDescription("");
        setNewTaskPriority("medium");
        setNewTaskDate("");
        loadTasks(Number(selectedLead.id));
        toast({ title: "Tarefa adicionada com sucesso" });
      }
    } catch (e) {
      toast({ title: "Erro ao adicionar tarefa", variant: "destructive" });
    } finally {
      setIsSavingTask(false);
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'low': return 'Baixa';
      case 'medium': return 'Média';
      case 'high': return 'Alta';
      case 'urgent': return 'Urgente';
      default: return 'Média';
    }
  };"""
if 'loadTasks = async' not in code:
    code = code.replace(load_proposals, load_proposals_new)

# 4. TabsTrigger for Tasks
tabs_trigger_old = """                      <TabsTrigger 
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
                    </TabsList>"""
tabs_trigger_new = """                      <TabsTrigger 
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
                        {leadTasks.filter(t => t.status !== 'completed').length > 0 && (
                          <span className="bg-secondary text-white text-[9px] px-1.5 py-0.5 rounded-full ml-1">
                            {leadTasks.filter(t => t.status !== 'completed').length}
                          </span>
                        )}
                      </TabsTrigger>
                    </TabsList>"""
if 'value="tasks"' not in code:
    code = code.replace(tabs_trigger_old, tabs_trigger_new)


# 5. TabsContent for Tasks
tabs_content_tasks = """
                        <TabsContent value="tasks" className="m-0 p-6 sm:p-8 outline-none min-h-full bg-slate-50/50 flex flex-col gap-6">
                          {/* Add Task Form */}
                          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Adicionar Nova Tarefa</h4>
                            
                            <div className="space-y-3">
                              <Input 
                                placeholder="Título da tarefa..." 
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                className="h-10 text-xs rounded-xl bg-slate-50 border border-slate-100 focus-visible:ring-secondary/20"
                              />
                              <Textarea 
                                placeholder="Descrição (opcional)..." 
                                value={newTaskDescription}
                                onChange={(e) => setNewTaskDescription(e.target.value)}
                                className="text-xs rounded-xl bg-slate-50 border border-slate-100 focus-visible:ring-secondary/20 min-h-[60px]"
                              />
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase">Prioridade</label>
                                  <Select value={newTaskPriority} onValueChange={(val: any) => setNewTaskPriority(val)}>
                                    <SelectTrigger className="h-10 text-xs rounded-xl bg-slate-50 border border-slate-100 focus:ring-secondary/20">
                                      <SelectValue>{getPriorityLabel(newTaskPriority)}</SelectValue>
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                      <SelectItem value="low">Baixa</SelectItem>
                                      <SelectItem value="medium">Média</SelectItem>
                                      <SelectItem value="high">Alta</SelectItem>
                                      <SelectItem value="urgent">Urgente</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase">Data e Hora</label>
                                  <Input 
                                    type="datetime-local" 
                                    value={newTaskDate}
                                    onChange={(e) => setNewTaskDate(e.target.value)}
                                    className="h-10 text-xs rounded-xl bg-slate-50 border border-slate-100 focus-visible:ring-secondary/20 font-headline"
                                  />
                                </div>
                              </div>
                              
                              <div className="flex justify-end pt-2">
                                <Button 
                                  onClick={handleSaveTask}
                                  disabled={!newTaskTitle.trim() || isSavingTask}
                                  variant="secondary"
                                  className="rounded-xl px-6 font-bold h-10 gap-2"
                                >
                                  {isSavingTask ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckSquare className="w-4 h-4" />}
                                  Adicionar Tarefa
                                </Button>
                              </div>
                            </div>
                          </div>

                          {/* List of Tasks */}
                          <div className="space-y-3">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Tarefas do Lead</h4>
                            
                            {leadTasks.length === 0 ? (
                              <div className="text-center py-10 bg-white rounded-2xl border border-slate-100 border-dashed">
                                <p className="text-sm text-slate-400 italic">Nenhuma tarefa registrada.</p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 gap-3">
                                {leadTasks.map(task => (
                                  <div key={task.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-start gap-3 shadow-sm hover:border-secondary/20 transition-colors">
                                    <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${task.status === 'completed' ? 'bg-secondary border-secondary text-white' : 'border-slate-300'}`}>
                                      {task.status === 'completed' && <Check className="w-3 h-3" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-sm font-bold ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-700'}`}>{task.title}</p>
                                      {task.description && (
                                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{task.description}</p>
                                      )}
                                      <div className="flex flex-wrap items-center gap-3 mt-3">
                                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded">
                                          <span className={`w-1.5 h-1.5 rounded-full ${
                                            task.priority === 'urgent' ? 'bg-red-500' :
                                            task.priority === 'high' ? 'bg-orange-500' :
                                            task.priority === 'medium' ? 'bg-blue-500' : 'bg-slate-400'
                                          }`}></span>
                                          {getPriorityLabel(task.priority)}
                                        </div>
                                        {task.dueDate && (
                                          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded">
                                            <Calendar className="w-3 h-3" />
                                            {safeFormatDate(task.dueDate)}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </TabsContent>
"""

# Inject before </Tabs> which ends the tabs area
# Need to find </Tabs>
idx = code.find('                        </TabsContent>\n                      </Tabs>')
if idx != -1 and 'value="tasks"' not in code:
    code = code[:idx] + '                        </TabsContent>\n' + tabs_content_tasks + '                      </Tabs>' + code[idx + len('                        </TabsContent>\n                      </Tabs>'):]

with open('src/pages/SalesFunnel.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print("Added Tasks!")
