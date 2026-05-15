import { FunnelColumn } from './FunnelColumn';

interface Stage {
  id: string;
  label: string;
  color: string;
}

interface FunnelBoardProps {
  stages: Stage[];
  leads: any[];
  onAddLead: (stageId: string) => void;
  onDragOver: (e: React.DragEvent, stageId: string) => void;
  onDrop: (e: React.DragEvent, stageId: string) => void;
  onDragLeave: () => void;
  dropTargetStage: string | null;
  
  // Column/Card Props
  isMultiSelectMode: boolean;
  selectedLeadIds: number[];
  onToggleLeadSelection: (id: number) => void;
  onSelectLead: (lead: any) => void;
  onDragStart: (e: React.DragEvent, id: number) => void;
  draggedLeadId: number | null;
  activeFunnel: string;
  onOpenWhatsApp: (phone: string) => void;
  onSubStatusChange: (id: number, subStatus: string | null) => void;
  onScheduleAppointment: (lead: any) => void;
  onOpenProposal: (leadId: number, leadValue: number, tags: string[]) => void;
  onOpenPayment: (lead: any) => void;
  onMoveLead: (id: number, status: string) => void;
  onScheduleClosed: (lead: any) => void;
  onSetActiveFunnel: (funnelId: string) => void;
  isProcessingSchedule: boolean;
  currentSchedulingLeadId: number | null;
  professionalName?: string;
  quickStatuses: any[];
}

export function FunnelBoard({
  stages,
  leads,
  onAddLead,
  onDragOver,
  onDrop,
  onDragLeave,
  dropTargetStage,
  isMultiSelectMode,
  selectedLeadIds,
  onToggleLeadSelection,
  onSelectLead,
  onDragStart,
  draggedLeadId,
  activeFunnel,
  onOpenWhatsApp,
  onSubStatusChange,
  onScheduleAppointment,
  onOpenProposal,
  onOpenPayment,
  onMoveLead,
  onScheduleClosed,
  onSetActiveFunnel,
  isProcessingSchedule,
  currentSchedulingLeadId,
  professionalName,
  quickStatuses
}: FunnelBoardProps) {
  return (
    <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-6 -mx-3 px-3 sm:-mx-4 sm:px-4 scrollbar-hide snap-x snap-mandatory sm:snap-none">
      {stages.map((stage) => (
        <FunnelColumn 
          key={stage.id}
          stage={stage}
          leads={leads}
          onAddLead={onAddLead}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onDragLeave={onDragLeave}
          isOver={dropTargetStage === stage.id}
          isMultiSelectMode={isMultiSelectMode}
          selectedLeadIds={selectedLeadIds}
          onToggleLeadSelection={onToggleLeadSelection}
          onSelectLead={onSelectLead}
          onDragStart={onDragStart}
          draggedLeadId={draggedLeadId}
          activeFunnel={activeFunnel}
          onOpenWhatsApp={onOpenWhatsApp}
          onSubStatusChange={onSubStatusChange}
          onScheduleAppointment={onScheduleAppointment}
          onOpenProposal={onOpenProposal}
          onOpenPayment={onOpenPayment}
          onMoveLead={onMoveLead}
          onScheduleClosed={onScheduleClosed}
          onSetActiveFunnel={onSetActiveFunnel}
          isProcessingSchedule={isProcessingSchedule}
          currentSchedulingLeadId={currentSchedulingLeadId}
          professionalName={professionalName}
          quickStatuses={quickStatuses}
        />
      ))}
    </div>
  );
}
