import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { GripVertical, Clock, Plus, Trash2, Pencil } from 'lucide-react'
import type { Lead, EtapaFunil } from '../types/database'
import { ETAPAS_FUNIL, ETAPA_NEXT, ETAPA_PREV } from '../types/database'
import { formatCurrency } from '../lib/format'
import { toast } from 'sonner'

interface PipelineKanbanProps {
  leads: Lead[]
  onMove?: (leadId: string, newEtapa: EtapaFunil) => Promise<void>
  onClickLead?: (lead: Lead) => void
  onDeleteLead?: (leadId: string) => void
  onEditLead?: (lead: Lead) => void
  onAddLead?: () => void
  readOnly?: boolean
}

const ETAPA_COLORS: Record<EtapaFunil, string> = {
  'Lead': 'bg-teal-500',
  'Lead Qualificado': 'bg-teal-600',
  'Oportunidade': 'bg-blue-500',
  'Cliente': 'bg-blue-600',
  'Doc. Consolidada': 'bg-violet-500',
  'Crédito Tomado': 'bg-violet-600',
}

function daysInStage(lead: Lead): number {
  const dateFields: Record<EtapaFunil, string | null> = {
    'Lead': lead.data_lead,
    'Lead Qualificado': lead.data_qualificado,
    'Oportunidade': lead.data_oportunidade,
    'Cliente': lead.data_cliente,
    'Doc. Consolidada': lead.data_doc_consolidada,
    'Crédito Tomado': lead.data_credito_tomado,
  }
  const entered = dateFields[lead.etapa]
  if (!entered) return 0
  return Math.floor((Date.now() - new Date(entered).getTime()) / (1000 * 60 * 60 * 24))
}

function LeadCardContent({ lead, compact, onEdit, onDelete }: {
  lead: Lead
  compact?: boolean
  onEdit?: (lead: Lead) => void
  onDelete?: (leadId: string) => void
}) {
  const days = daysInStage(lead)
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className={`bg-white rounded-lg border border-slate-200 p-3 shadow-sm group ${compact ? '' : 'hover:shadow-md transition-shadow'}`}>
      <div className="flex items-start gap-2">
        {!compact && (
          <GripVertical size={14} className="text-slate-300 mt-0.5 shrink-0 cursor-grab" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <p className="text-sm font-medium text-slate-800 truncate">{lead.nome_empresa}</p>
            {(onEdit || onDelete) && !confirmDelete && (
              <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                {onEdit && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(lead) }}
                    className="p-1 rounded text-slate-400 hover:text-teal-600 hover:bg-teal-50"
                    title="Editar"
                  >
                    <Pencil size={12} />
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(true) }}
                    className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    title="Excluir"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            )}
          </div>
          {confirmDelete && (
            <div className="flex items-center gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => { onDelete?.(lead.id); setConfirmDelete(false) }}
                className="px-2 py-0.5 text-xs font-medium text-white bg-rose-500 rounded hover:bg-rose-600"
              >
                Excluir
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-0.5 text-xs font-medium text-slate-500 bg-slate-100 rounded hover:bg-slate-200"
              >
                Cancelar
              </button>
            </div>
          )}
          {lead.demanda && (
            <p className="text-xs text-slate-500 mt-0.5">{formatCurrency(lead.demanda)}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Clock size={10} />
              {days}d
            </span>
            {lead.status !== 'Ativo' && (
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                lead.status === 'Perdido' ? 'bg-rose-100 text-rose-600' :
                lead.status === 'Pausado' ? 'bg-amber-100 text-amber-600' :
                'bg-emerald-100 text-emerald-600'
              }`}>
                {lead.status}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function DraggableCard({ lead, onClick, onEdit, onDelete }: {
  lead: Lead
  onClick?: () => void
  onEdit?: (lead: Lead) => void
  onDelete?: (leadId: string) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: lead.id,
    data: { lead },
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`${isDragging ? 'opacity-30' : ''} cursor-pointer`}
    >
      <LeadCardContent lead={lead} onEdit={onEdit} onDelete={onDelete} />
    </div>
  )
}

function DroppableColumn({
  etapa,
  leads,
  onClickLead,
  onEditLead,
  onDeleteLead,
  onAddLead,
  readOnly,
  isFirst,
}: {
  etapa: EtapaFunil
  leads: Lead[]
  onClickLead?: (lead: Lead) => void
  onEditLead?: (lead: Lead) => void
  onDeleteLead?: (leadId: string) => void
  onAddLead?: () => void
  readOnly?: boolean
  isFirst: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: etapa })
  const totalDemanda = leads.reduce((sum, l) => sum + (l.demanda || 0), 0)

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-w-[200px] w-[200px] rounded-xl transition-colors ${
        isOver ? 'bg-teal-50 ring-2 ring-teal-300' : 'bg-slate-50'
      }`}
    >
      <div className="p-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${ETAPA_COLORS[etapa]}`} />
          <span className="text-xs font-semibold text-slate-700 truncate">{etapa}</span>
          <span className="ml-auto text-xs font-medium text-slate-400 bg-white px-1.5 py-0.5 rounded">
            {leads.length}
          </span>
        </div>
        {totalDemanda > 0 && (
          <p className="text-xs text-slate-400 mt-1">{formatCurrency(totalDemanda)}</p>
        )}
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[60vh]">
        {leads.map((lead) =>
          readOnly ? (
            <div key={lead.id} onClick={() => onClickLead?.(lead)} className="cursor-pointer">
              <LeadCardContent lead={lead} compact />
            </div>
          ) : (
            <DraggableCard key={lead.id} lead={lead} onClick={() => onClickLead?.(lead)} onEdit={onEditLead} onDelete={onDeleteLead} />
          )
        )}
        {leads.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-4">Nenhum lead</p>
        )}
        {!readOnly && isFirst && onAddLead && (
          <button
            onClick={onAddLead}
            className="w-full flex items-center justify-center gap-1 py-2 text-xs text-teal-600 hover:bg-teal-50 rounded-lg border border-dashed border-teal-300 transition-colors"
          >
            <Plus size={14} />
            Novo Lead
          </button>
        )}
      </div>
    </div>
  )
}

export default function PipelineKanban({ leads, onMove, onClickLead, onDeleteLead, onEditLead, onAddLead, readOnly = false }: PipelineKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const leadsByEtapa = ETAPAS_FUNIL.reduce<Record<EtapaFunil, Lead[]>>((acc, etapa) => {
    acc[etapa] = leads.filter((l) => l.etapa === etapa)
    return acc
  }, {} as Record<EtapaFunil, Lead[]>)

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over || !onMove) return

    const lead = leads.find((l) => l.id === active.id)
    if (!lead) return

    const targetEtapa = over.id as EtapaFunil
    if (targetEtapa === lead.etapa) return

    // Enforce sequential: only allow moving to next or previous stage
    const next = ETAPA_NEXT[lead.etapa]
    const prev = ETAPA_PREV[lead.etapa]
    if (targetEtapa !== next && targetEtapa !== prev) {
      toast.error('Leads só podem avançar ou voltar uma etapa por vez.')
      return
    }

    await onMove(lead.id, targetEtapa)
  }

  if (readOnly) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-4">
        {ETAPAS_FUNIL.map((etapa, i) => (
          <DroppableColumn
            key={etapa}
            etapa={etapa}
            leads={leadsByEtapa[etapa]}
            onClickLead={onClickLead}
            readOnly
            isFirst={i === 0}
          />
        ))}
      </div>
    )
  }

  return (
    <DndContext collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {ETAPAS_FUNIL.map((etapa, i) => (
          <DroppableColumn
            key={etapa}
            etapa={etapa}
            leads={leadsByEtapa[etapa]}
            onClickLead={onClickLead}
            onEditLead={onEditLead}
            onDeleteLead={onDeleteLead}
            onAddLead={onAddLead}
            isFirst={i === 0}
          />
        ))}
      </div>
      <DragOverlay>
        {activeLead && (
          <div className="w-[200px]">
            <LeadCardContent lead={activeLead} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
