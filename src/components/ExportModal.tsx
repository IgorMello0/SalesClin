import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'excel' | 'csv' | 'sheets', selection: string) => void;
  selectedCount: number;
}

export function ExportModal({ isOpen, onClose, onExport, selectedCount }: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<'excel' | 'csv' | 'sheets'>('excel');
  const [exportScope, setExportScope] = useState<'all' | 'selected'>('all');
  const [asciiEncoding, setAsciiEncoding] = useState(false);

  const handleExport = () => {
    onExport(selectedFormat, exportScope);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] rounded-3xl p-0 overflow-hidden bg-white/95 backdrop-blur-xl border-slate-100/50">
        <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-white">
          <DialogTitle className="text-xl font-bold font-headline text-slate-800">Exportar</DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* EXCEL */}
          <div 
            onClick={() => setSelectedFormat('excel')}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${selectedFormat === 'excel' ? 'border-green-500 bg-green-50' : 'border-slate-100 hover:border-slate-200'}`}
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-12 bg-green-100 rounded flex items-center justify-center text-green-700 font-bold text-[10px] uppercase border border-green-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-3 h-3 bg-white/50 rounded-bl" />
                XLS
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-slate-800 mb-1">Excel</h4>
                <p className="text-sm text-slate-500 mb-3">Exportar sua lista de clientes para um arquivo do Microsoft Excel</p>
                {selectedFormat === 'excel' && (
                  <Select value={exportScope} onValueChange={(val: any) => setExportScope(val)}>
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Leads</SelectItem>
                      <SelectItem value="selected" disabled={selectedCount === 0}>Selecionados ({selectedCount})</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>

          {/* CSV */}
          <div 
            onClick={() => setSelectedFormat('csv')}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${selectedFormat === 'csv' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 hover:border-slate-200'}`}
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-12 bg-emerald-100 rounded flex items-center justify-center text-emerald-700 font-bold text-[10px] uppercase border border-emerald-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-3 h-3 bg-white/50 rounded-bl" />
                CSV
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-slate-800 mb-1">Arquivo CSV</h4>
                <p className="text-sm text-slate-500 mb-3">Exporte sua lista de clientes para um formato compatível com programas como o Planilhas Google, OpenOffice, Excel e muito mais</p>
                {selectedFormat === 'csv' && (
                  <div className="space-y-3">
                    <Select value={exportScope} onValueChange={(val: any) => setExportScope(val)}>
                      <SelectTrigger className="w-full bg-white">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os Leads</SelectItem>
                        <SelectItem value="selected" disabled={selectedCount === 0}>Selecionados ({selectedCount})</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="ascii" checked={asciiEncoding} onCheckedChange={(checked) => setAsciiEncoding(!!checked)} />
                      <label htmlFor="ascii" className="text-sm text-slate-600 cursor-pointer">Codificação ASCII</label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* GOOGLE SHEETS */}
          <div 
            onClick={() => setSelectedFormat('sheets')}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${selectedFormat === 'sheets' ? 'border-teal-500 bg-teal-50' : 'border-slate-100 hover:border-slate-200'}`}
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-12 bg-teal-100 rounded flex items-center justify-center text-teal-700 font-bold text-[9px] uppercase border border-teal-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-3 h-3 bg-white/50 rounded-bl" />
                DOCS
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-slate-800 mb-1">Planilhas Google</h4>
                <p className="text-sm text-slate-500 mb-3">Formato CSV (Otimizado para o Planilhas Google)</p>
                {selectedFormat === 'sheets' && (
                  <div className="space-y-3">
                    <Select value={exportScope} onValueChange={(val: any) => setExportScope(val)}>
                      <SelectTrigger className="w-full bg-white">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os Leads</SelectItem>
                        <SelectItem value="selected" disabled={selectedCount === 0}>Selecionados ({selectedCount})</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" className="w-fit gap-2" type="button">
                      <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" alt="Google" className="w-4 h-4 object-contain" />
                      Autorizar
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        <DialogFooter className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose} className="rounded-xl">Cancelar</Button>
          <Button onClick={handleExport} className="rounded-xl font-bold bg-primary hover:bg-primary/90 text-white">Exportar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
