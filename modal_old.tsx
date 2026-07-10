        <DialogContent className="sm:max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden rounded-none sm:rounded-3xl border-0 sm:border sm:border-slate-100 bg-white p-0 flex flex-col w-full h-full sm:h-[85vh]">
          {selectedLead && (
            <>
              {/* Header Profile Section */}
              {/* Modern Header Profile Section (Sticky Top) */}
              <div className="p-4 sm:p-6 bg-white border-b border-slate-100 flex flex-col gap-4 shrink-0 z-20 relative shadow-sm">
                
                {/* Top: Avatar, Name, Status, Actions */}
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-between items-start sm:items-center">
                  <div className="flex items-center gap-4 sm:gap-6">
                    <div className="w-12 h-12 rounded-[1rem] bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-2xl font-extrabold text-white shadow-lg shadow-primary/20">
                      {selectedLead.avatar}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3 group/name">
                        {isEditingName ? (
                          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                            <Input 
                              value={tempName}
                              onChange={(e) => setTempName(e.target.value)}
                              className="text-lg sm:text-xl font-extrabold text-primary font-headline tracking-tight h-10 rounded-xl border-secondary focus-visible:ring-secondary/20 bg-white"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdateName();
                                if (e.key === 'Escape') setIsEditingName(false);
                              }}
                            />
                            <Button onClick={handleUpdateName} variant="secondary" size="sm" className="h-9 w-9 rounded-xl p-0"><Check className="w-4 h-4" /></Button>
                            <Button onClick={() => setIsEditingName(false)} variant="ghost" size="sm" className="h-9 w-9 rounded-xl p-0 text-slate-400"><X className="w-4 h-4" /></Button>
                          </div>
                        ) : (
                          <>
                            <h3 
                              className="text-xl sm:text-2xl font-extrabold text-primary font-headline tracking-tight cursor-pointer hover:text-primary/80 transition-colors"
                              onClick={() => setIsEditingName(true)}
                            >
                              {selectedLead.name}
                            </h3>
                            <button onClick={() => setIsEditingName(true)} className="opacity-0 group-hover/name:opacity-100 text-slate-300 hover:text-secondary transition-all">
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                      
                      {/* Funnel and Stage */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Select value={selectedFunnelForEdit} onValueChange={setSelectedFunnelForEdit}>
                          <SelectTrigger className="h-8 px-3 text-xs font-bold border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors w-auto rounded-lg">
                            <SelectValue placeholder="Funil">
                              {funnelList.find(f => (f.code || f.id) === selectedFunnelForEdit)?.label}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="z-[300]">
                            {funnelList.map((f: any) => (
                              <SelectItem key={f.code || f.id} value={f.code || f.id} className="text-xs">{f.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <span className="text-slate-300 material-symbols-outlined text-sm">chevron_right</span>

                        <Select
                          value={stageValue}
                          onValueChange={async (newStatus) => {
                            try {
                              const res = await leadsApi.update(Number(selectedLead.id), { status: newStatus });
                              if (res.success) {
                                toast({ title: 'Estágio do lead atualizado!' });
                                setSelectedLead({ ...selectedLead, status: newStatus });
                                loadLeads();
                              }
                            } catch (e) {
                              toast({ title: 'Erro ao atualizar estágio', variant: 'destructive' });
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 px-3 text-xs font-bold border-secondary/20 bg-secondary/5 hover:bg-secondary/10 text-secondary transition-colors w-auto rounded-lg">
                            <SelectValue placeholder="Estágio">
                              {editStages.find(s => (s.id || s.code) === stageValue)?.label || 'Selecione a Etapa'}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="z-[300]">
                            {editStages.map((s: any) => (
                              <SelectItem key={s.id || s.code} value={s.id || s.code} className="text-xs">{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button 
                      onClick={() => openWhatsApp(selectedLead.phone)}
                      className="flex-1 sm:flex-none rounded-xl h-11 bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-sm shadow-[#25D366]/20 font-bold gap-2"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                      WhatsApp
                    </Button>
                    <Button 
                      onClick={() => window.open(`tel:${selectedLead.phone}`)}
                      variant="outline" 
                      className="flex-1 sm:flex-none rounded-xl h-11 border-slate-200 text-primary hover:bg-slate-50 font-bold gap-2"
                    >
                      <span className="material-symbols-outlined text-xl">call</span>
                      Ligar
                    </Button>
                  </div>
                </div>
              </div>

              {/* Scrollable Body (Cards, Notes, Timeline) */}
              <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col bg-slate-50/30">
                {/* Middle Strip: Lead Details Cards */}
                <div className="p-4 sm:p-6 bg-white border-b border-slate-100 shrink-0">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {/* Valor do Lead */}
                  <div className="bg-orange-50/50 rounded-xl p-3 border border-orange-100 flex flex-col justify-center">
                    <p className="text-[10px] font-bold text-orange-400/80 uppercase tracking-widest mb-1">Valor Estimado</p>
                    <p className="text-sm font-bold text-secondary">{selectedLead.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  </div>

                  {/* Telefone */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col justify-center group/phone relative">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Telefone</p>
                    {isEditingPhone ? (
                      <div className="flex items-center gap-1">
                        <Input value={tempPhone} onChange={(e) => setTempPhone(e.target.value)} className="h-7 px-2 text-xs font-bold border-secondary bg-white" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') handleUpdatePhone(); if (e.key === 'Escape') setIsEditingPhone(false); }} />
                        <button onClick={handleUpdatePhone} className="text-emerald-500"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setIsEditingPhone(false)} className="text-slate-400"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-primary truncate cursor-pointer hover:text-secondary" onClick={() => setIsEditingPhone(true)}>{selectedLead.phone || 'Sem telefone'}</p>
                        <button onClick={() => setIsEditingPhone(true)} className="opacity-0 group-hover/phone:opacity-100 text-slate-300 hover:text-secondary transition-all absolute right-2"><Edit2 className="w-3 h-3" /></button>
                      </div>
                    )}
                  </div>

                  {/* Email */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col justify-center group/email relative">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">E-mail</p>
                    {isEditingEmail ? (
                      <div className="flex items-center gap-1">
                        <Input value={tempEmail} onChange={(e) => setTempEmail(e.target.value)} className="h-7 px-2 text-xs font-bold border-secondary bg-white" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateEmail(); if (e.key === 'Escape') setIsEditingEmail(false); }} />
                        <button onClick={handleUpdateEmail} className="text-emerald-500"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setIsEditingEmail(false)} className="text-slate-400"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-primary truncate cursor-pointer hover:text-secondary" onClick={() => setIsEditingEmail(true)} title={selectedLead.email}>{selectedLead.email || 'Não informado'}</p>
                        <button onClick={() => setIsEditingEmail(true)} className="opacity-0 group-hover/email:opacity-100 text-slate-300 hover:text-secondary transition-all absolute right-2"><Edit2 className="w-3 h-3" /></button>
                      </div>
                    )}
                  </div>

                  {/* Origem */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col justify-center group/origin relative">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Origem</p>
                    {isEditingOrigin ? (
                      <div className="flex items-center gap-1">
                        <Select value={tempOrigin} onValueChange={(val) => { setTempOrigin(val); const saveOrigin = async (newVal: string) => { try { const res = await leadsApi.update(Number(selectedLead.id), { origin: newVal }); if (res.success) { toast({ title: 'Origem atualizada!' }); setSelectedLead({ ...selectedLead, origin: newVal }); setLeads(leads.map(l => l.id === selectedLead.id ? { ...l, origin: newVal } : l)); setIsEditingOrigin(false); } } catch (e) { toast({ title: 'Erro ao atualizar', variant: 'destructive' }); } }; saveOrigin(val); }}>
                          <SelectTrigger className="h-7 px-2 text-xs font-bold border-secondary bg-white"><SelectValue>{getOriginLabel(tempOrigin)}</SelectValue></SelectTrigger>
                          <SelectContent>{ORIGIN_OPTIONS.map(opt => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent>
                        </Select>
                        <button onClick={() => setIsEditingOrigin(false)} className="text-slate-400"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-primary truncate capitalize cursor-pointer hover:text-secondary" onClick={() => setIsEditingOrigin(true)}>{getOriginLabel(selectedLead.origin || 'Não informado')}</p>
                        <button onClick={() => setIsEditingOrigin(true)} className="opacity-0 group-hover/origin:opacity-100 text-slate-300 hover:text-secondary transition-all absolute right-2"><Edit2 className="w-3 h-3" /></button>
                      </div>
                    )}
                  </div>

                  {/* Responsável */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col justify-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Responsável</p>
                    <p className="text-xs font-bold text-primary truncate">{selectedLead.responsible || professional?.name || 'Sistema'}</p>
                  </div>
                </div>
              </div>

              {/* Main Body: Full Width Timeline */}
              <div className="flex-1 bg-slate-50/30 flex flex-col min-h-0 h-full">

                    {/* Activity Top Action */}
                    <div className="p-4 sm:p-8 border-b border-slate-100 bg-white/50 space-y-3 sm:space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Linha do Tempo de Atividades</h4>
                        <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Em Tempo Real
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <Textarea 
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder="Digite uma nota sobre esse lead..." 
                          className="rounded-xl border-slate-200 focus:ring-secondary/20 min-h-[80px] text-sm"
                        />
                        <div className="flex justify-end">
                          <Button 
                            onClick={handleSaveNote}
                            disabled={!noteText.trim()}
                            variant="secondary"
                            className="rounded-xl px-6 font-bold h-10 gap-2"
                          >
                            <span className="material-symbols-outlined text-sm">save</span>
                            Salvar Nota
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Scrollable Timeline / Proposals */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                      <Tabs value={activeDetailsTab} onValueChange={setActiveDetailsTab} className="w-full flex-1 flex flex-col">
                        <div className="px-4 sm:px-8 border-b border-slate-100 bg-white">
                          <TabsList className="bg-transparent border-0 h-14 p-0 gap-8">
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
                                <span className="bg-secondary text-white text-[9px] px-1.5 py-0.5 rounded-full">
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

                        <TabsContent value="activities" className="flex-1 p-4 sm:p-8 m-0 outline-none">
                          <div className="relative pl-8 space-y-12">
                            {/* The Vertical Line */}
                            <div className="absolute left-[15px] top-2 bottom-4 w-[2px] bg-slate-200"></div>

                            {selectedLead.activities.map((act, idx) => (
                              <div key={act.id} className="relative animate-in slide-in-from-left-4 duration-500" style={{ animationDelay: `${idx * 150}ms` }}>
                                {/* Node Dot/Icon */}
                                <div className={cn(
                                  "absolute -left-[32px] top-0 w-8 h-8 rounded-full flex items-center justify-center border-2 border-white z-10",
                                  act.color || "bg-[#001B3D]" // Default Navy
                                )}>
                                  <span className="material-symbols-outlined text-white text-[16px]">{act.icon}</span>
                                </div>

                                {/* Content Card */}
                                <div className="space-y-2">
                                  <header className="flex flex-col sm:flex-row sm:items-center gap-2">
                                    <span className="text-sm font-extrabold text-primary font-headline">{act.user}</span>
                                    <span className="text-xs text-slate-400 font-medium">{act.action}</span>
                                  </header>

                                  {act.result && (
                                    <div className="space-y-1">
                                      <p className="text-[10px] font-bold text-slate-500 uppercase">Resultado</p>
                                      <p className="text-xs font-bold text-slate-700">{act.result}</p>
                                    </div>
                                  )}

                                  {act.content && (
                                    <div className="space-y-1">
                                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Detalhamento</p>
                                      {editingActivityId === act.id ? (
                                        <div className="space-y-2 animate-in fade-in duration-200">
                                          <Textarea
                                            value={tempActivityContent}
                                            onChange={(e) => setTempActivityContent(e.target.value)}
                                            className="text-xs text-slate-600 leading-relaxed font-medium border-secondary focus:ring-secondary/20 min-h-[60px] bg-white rounded-xl"
                                            autoFocus
                                            onKeyDown={(e) => {
                                              if (e.key === 'Escape') setEditingActivityId(null);
                                            }}
                                          />
                                          <div className="flex justify-end gap-2">
                                            <Button 
                                              onClick={() => handleUpdateActivity(act.id)} 
                                              variant="secondary" 
                                              size="sm" 
                                              className="h-8 px-3 text-[10px] font-bold gap-1 rounded-lg"
                                            >
                                              <Check className="w-3.5 h-3.5" /> Salvar
                                            </Button>
                                            <Button 
                                              onClick={() => setEditingActivityId(null)} 
                                              variant="ghost" 
                                              size="sm" 
                                              className="h-8 px-3 text-[10px] font-bold gap-1 text-slate-400 rounded-lg"
                                            >
                                              <X className="w-3.5 h-3.5" /> Cancelar
                                            </Button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm border-l-4 border-secondary/20 group/note relative">
                                          <p className="text-xs text-slate-600 leading-relaxed font-medium pr-14">{act.content}</p>
                                          {act.type === 'task' && (
                                            <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 group-hover/note:opacity-100 transition-all duration-200 animate-in fade-in">
                                              <button 
                                                onClick={() => {
                                                  setEditingActivityId(act.id);
                                                  setTempActivityContent(act.content || "");
                                                }} 
                                                className="text-slate-400 hover:text-secondary transition-colors p-1 rounded hover:bg-slate-50"
                                                title="Editar Anotação"
                                              >
                                                <Edit2 className="w-3.5 h-3.5" />
                                              </button>
                                              <button 
                                                onClick={() => setActivityToDeleteId(act.id)} 
                                                className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50"
                                                title="Excluir Anotação"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  <footer className="text-[10px] font-bold text-slate-300 pt-1 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[12px]">schedule</span>
                                    {act.date}
                                  </footer>
                                </div>
                              </div>
                            ))}
                            {selectedLead.activities.length === 0 && (
                              <div className="text-center py-10">
                                <p className="text-sm text-slate-400 italic">Nenhuma atividade registrada.</p>
                              </div>
                            )}
                          </div>
                        </TabsContent>

                        <TabsContent value="proposals" className="flex-1 p-4 sm:p-8 m-0 outline-none">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {leadProposals.map((proposal) => (
                              <div 
                                key={proposal.id} 
                                className="group bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md hover:border-secondary/20 transition-all cursor-pointer relative overflow-hidden"
                                onClick={() => handleViewProposal(proposal)}
                              >
                                <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Eye className="w-5 h-5 text-secondary" />
                                </div>
                                
                                <div className="flex items-start gap-4">
                                  <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                                    <FileText className="w-6 h-6" />
                                  </div>
                                  <div className="space-y-1">
                                    <h5 className="font-bold text-primary text-sm line-clamp-1">{proposal.title}</h5>
                                    <p className="text-xs text-slate-400 font-medium">#{proposal.id}</p>
                                  </div>
                                </div>

                                <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-end">
                                  <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor</p>
                                    <p className="text-sm font-bold text-secondary">
                                      {Number(proposal.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data</p>
                                    <p className="text-[10px] font-bold text-primary">
                                      {safeFormatDate(proposal.createdAt)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}

                            {leadProposals.length === 0 && !isLoadingProposals && (
                              <div className="col-span-2 flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">request_quote</span>
                                <p className="text-sm font-bold text-slate-500">Nenhuma proposta encontrada</p>
                                <p className="text-xs text-slate-400 mt-1">Gere sua primeira proposta para este lead.</p>
                              </div>
                            )}

                            {isLoadingProposals && (
                              <div className="col-span-2 flex items-center justify-center py-20">
                                <Loader2 className="w-8 h-8 text-secondary animate-spin" />
                              </div>
                            )}
                          </div>
                        </TabsContent>

                        <TabsContent value="tasks" className="flex-1 p-4 sm:p-8 m-0 outline-none overflow-y-auto">
                          <div className="space-y-6">
                            <h4 className="text-sm font-bold text-primary">Nova Tarefa para o Lead</h4>
                            <div className="space-y-4 bg-slate-50 p-4 sm:p-6 rounded-2xl border border-slate-100">
                              <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase text-slate-500">O que precisa ser feito?</Label>
                                <Input 
                                  placeholder="Ex: Retornar amanhã de manhã" 
                                  value={newTaskTitle}
                                  onChange={(e) => setNewTaskTitle(e.target.value)}
                                  className="bg-white border-slate-200"
                                />
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label className="text-xs font-bold uppercase text-slate-500">Data e Hora</Label>
                                  <Input 
                                    type="datetime-local" 
                                    value={newTaskDueDate}
                                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                                    className="bg-white border-slate-200"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs font-bold uppercase text-slate-500">Prioridade</Label>
                                  <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                                    <SelectTrigger className="bg-white border-slate-200">
                                      <SelectValue placeholder="Média">
                                        {newTaskPriority === 'low' ? 'Baixa' :
                                         newTaskPriority === 'medium' ? 'Média' :
                                         newTaskPriority === 'high' ? 'Alta' :
                                         newTaskPriority === 'urgent' ? 'Urgente' : 'Média'}
                                      </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="low">Baixa</SelectItem>
                                      <SelectItem value="medium">Média</SelectItem>
                                      <SelectItem value="high">Alta</SelectItem>
                                      <SelectItem value="urgent">Urgente</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <Button 
                                onClick={handleCreateLeadTask} 
                                disabled={isCreatingTask || !newTaskTitle || !newTaskDueDate}
                                className="w-full font-bold mt-2 rounded-xl h-11 bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20"
                              >
                                {isCreatingTask ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckSquare className="w-4 h-4 mr-2" />}
                                Adicionar Tarefa
                              </Button>
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </div>
                </div>
            </>
          )}
        </DialogContent>