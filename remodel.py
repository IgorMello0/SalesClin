import sys

with open('src/pages/SalesFunnel.tsx', 'r', encoding='utf-8') as f:
    code = f.read().replace('\r\n', '\n')

# 1. DialogContent classes
old_dialog = '        <DialogContent className="sm:max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto rounded-none sm:rounded-3xl border-0 sm:border sm:border-slate-100 bg-white p-0 flex flex-col w-full h-full sm:h-auto">'
new_dialog = '        <DialogContent className="sm:max-w-6xl max-h-[95vh] sm:h-[90vh] overflow-hidden rounded-none sm:rounded-[2rem] border-0 sm:border sm:border-slate-100 bg-slate-50 p-0 flex flex-col lg:flex-row w-full shadow-2xl">'
code = code.replace(old_dialog, new_dialog)

# 2. Header Profile Section wrapper
old_header = """              {/* Header Profile Section */}
              <div className="p-4 sm:p-8 bg-gradient-to-br from-primary/5 to-transparent border-b border-slate-100">
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 items-start">
                  <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl bg-primary flex items-center justify-center text-2xl sm:text-3xl font-extrabold text-white">"""

new_header = """              {/* Left Sidebar */}
              <div className="w-full lg:w-[400px] shrink-0 h-auto lg:h-full overflow-y-auto custom-scrollbar bg-white lg:border-r border-b lg:border-b-0 border-slate-100 flex flex-col p-6 sm:p-8 z-20 relative">
                <div className="flex flex-col gap-6 items-center w-full">
                  <div className="w-24 h-24 rounded-[1.75rem] bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-4xl font-extrabold text-white shadow-xl shadow-primary/20 ring-4 ring-slate-50 shrink-0">"""
code = code.replace(old_header, new_header)

# 3. Change flex layout for name input/display
old_name_wrapper = """                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="flex justify-between items-start w-full">
                      <div className="flex-1">
                        {isEditingName ? (
                          <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2">"""

new_name_wrapper = """                  </div>
                  <div className="flex-1 space-y-4 w-full flex flex-col items-center">
                    <div className="flex flex-col items-center justify-center w-full gap-3">
                      <div className="w-full flex items-center justify-center">
                        {isEditingName ? (
                          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 w-full">"""
code = code.replace(old_name_wrapper, new_name_wrapper)

old_name_input = """                              className="text-xl sm:text-2xl font-extrabold text-primary font-headline tracking-tighter h-12 rounded-xl border-secondary focus-visible:ring-secondary/20 bg-white"
                              autoFocus"""
new_name_input = """                              className="text-2xl text-center font-extrabold text-primary font-headline tracking-tighter h-12 rounded-xl border-secondary focus-visible:ring-secondary/20 bg-white w-full"
                              autoFocus"""
code = code.replace(old_name_input, new_name_input)

old_name_display = """                          <div className="flex items-center gap-3 group/name">
                            <h3 
                              className="text-xl sm:text-3xl font-extrabold text-primary font-headline tracking-tighter cursor-pointer hover:text-primary/80 transition-colors"
                              onClick={() => setIsEditingName(true)}
                            >
                              {selectedLead.name}
                            </h3>
                            <button 
                              onClick={() => setIsEditingName(true)}"""
new_name_display = """                          <div className="flex items-center gap-3 group/name relative justify-center w-full">
                            <h3 
                              className="text-2xl font-extrabold text-primary font-headline tracking-tighter cursor-pointer hover:text-primary/80 transition-colors text-center"
                              onClick={() => setIsEditingName(true)}
                            >
                              {selectedLead.name}
                            </h3>
                            <button 
                              onClick={() => setIsEditingName(true)}"""
code = code.replace(old_name_display, new_name_display)

old_stage = """                        <div className="flex flex-col sm:flex-row gap-2 mt-1 w-full items-start sm:items-center">
                          <div className="flex items-center gap-2">"""
new_stage = """                        <div className="flex flex-col gap-2 mt-2 w-full items-center justify-center">
                          <div className="flex items-center gap-2">"""
code = code.replace(old_stage, new_stage)

# 4. Action buttons layout (Call / Whatsapp)
old_actions = """                        </div>
                      </div>
                      <div className="flex gap-2 mr-8 sm:mr-6">
                        <Button 
                          onClick={() => openWhatsApp(selectedLead.phone)}
                          variant="outline" 
                          className="rounded-full h-10 w-10 p-0 border-slate-200 text-emerald-500 hover:bg-emerald-50"
                          title="Abrir WhatsApp"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                          </svg>
                        </Button>
                        <Button 
                          onClick={() => window.open(`tel:${selectedLead.phone}`)}
                          variant="outline" 
                          className="rounded-full h-10 w-10 p-0 border-slate-200 text-blue-500 hover:bg-blue-50"
                          title="Ligar"
                        >
                          <span className="material-symbols-outlined text-xl">call</span>
                        </Button>
                      </div>"""
new_actions = """                        </div>
                      </div>
                      <div className="flex gap-3 w-full mt-2">
                        <Button 
                          onClick={() => openWhatsApp(selectedLead.phone)}
                          variant="outline" 
                          className="rounded-full flex-1 h-12 p-0 border-slate-200 text-emerald-500 hover:bg-emerald-50 shadow-sm"
                          title="Abrir WhatsApp"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                          </svg>
                        </Button>
                        <Button 
                          onClick={() => window.open(`tel:${selectedLead.phone}`)}
                          variant="outline" 
                          className="rounded-full flex-1 h-12 p-0 border-slate-200 text-blue-500 hover:bg-blue-50 shadow-sm"
                          title="Ligar"
                        >
                          <span className="material-symbols-outlined text-xl">call</span>
                        </Button>
                      </div>"""
code = code.replace(old_actions, new_actions)

old_details_grid = '                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 pt-3 sm:pt-4">'
new_details_grid = '                    <hr className="border-slate-100 my-4 w-full" />\n                    <div className="flex flex-col gap-4 w-full">'
code = code.replace(old_details_grid, new_details_grid)


# 5. Remove 'Left Side: General Info' COMPLETELY.
# It starts at 1887 and ends exactly before 'Right Side: Vertical Timeline' which we also want to remove.
start_delete = '              {/* Main Body: Info vs Timeline */}'
end_delete = '                {/* Right Side: Vertical Timeline (As requested) */}'

idx1 = code.find(start_delete)
idx2 = code.find(end_delete, idx1)
if idx1 != -1 and idx2 != -1:
    code = code[:idx1] + code[idx2:]


# 6. Change Right Side wrapper
old_right = """                {/* Right Side: Vertical Timeline (As requested) */}
                <div className="lg:col-span-2 bg-slate-50/30 flex flex-col min-h-0 h-full">"""
new_right = """                {/* Right Side: Main Area (Tabs + Timeline) */}
                <div className="flex-1 bg-slate-50/50 flex flex-col min-w-0 h-full relative overflow-hidden">"""
code = code.replace(old_right, new_right)

# 7. Tabs Header
old_tabs_header = """                        <div className="px-4 sm:px-8 border-b border-slate-100 bg-white">
                          <TabsList className="bg-transparent border-0 h-14 p-0 gap-8">"""
new_tabs_header = """                        <div className="px-6 sm:px-8 border-b border-slate-200 bg-white shrink-0 z-10 sticky top-0 flex items-center h-16 shadow-sm">
                          <TabsList className="bg-transparent border-0 h-full p-0 gap-8 w-full justify-start">"""
code = code.replace(old_tabs_header, new_tabs_header)

with open('src/pages/SalesFunnel.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print('Done remodeling!')
