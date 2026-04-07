import { useState, useCallback } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { ArrowRight, Save, Plus, Trash2, GripVertical } from 'lucide-react'

export interface FieldDef {
  id: string
  name: string
  type: string
  sample?: string
}

export interface FieldMapping {
  sourceId: string
  targetId: string
}

interface FieldMapperProps {
  sourceLabel: string
  targetLabel: string
  sourceFields: FieldDef[]
  targetFields: FieldDef[]
  existingMappings?: FieldMapping[]
  onSave: (mappings: FieldMapping[]) => void
}

function DraggableField({ field, side }: { field: FieldDef; side: 'source' | 'target' }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${side}::${field.id}`,
    data: { field, side },
  })
  const style = { transform: CSS.Translate.toString(transform) }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
        isDragging
          ? 'border-blue-400 bg-blue-500/20 opacity-70 cursor-grabbing'
          : 'border-[#1E293B] bg-[#0B0F19] cursor-grab hover:border-blue-500/40 hover:bg-blue-500/5'
      }`}
    >
      <GripVertical className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" {...listeners} />
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-medium truncate">{field.name}</p>
        {field.sample && <p className="text-slate-600 text-xs truncate">{field.sample}</p>}
      </div>
      <span className="text-xs px-1.5 py-0.5 rounded bg-[#1E293B] text-slate-400 font-mono">
        {field.type}
      </span>
    </div>
  )
}

function DroppableField({ field, mapping }: { field: FieldDef; mapping?: FieldDef }) {
  const { isOver, setNodeRef } = useDroppable({ id: `target::${field.id}` })

  return (
    <div className="flex items-center gap-2">
      {/* Mapped source */}
      <div className="w-36 h-9 flex items-center">
        {mapping ? (
          <div className="flex-1 px-2 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs font-medium truncate">
            {mapping.name}
          </div>
        ) : (
          <div className="flex-1 h-full border border-dashed border-[#1E293B] rounded-lg" />
        )}
      </div>

      <ArrowRight className="w-4 h-4 text-slate-600 flex-shrink-0" />

      {/* Target field drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 px-3 py-2 rounded-lg border transition-all ${
          isOver
            ? 'border-blue-400 bg-blue-500/10'
            : 'border-[#1E293B] bg-[#0B0F19]'
        }`}
      >
        <p className="text-white text-xs font-medium">{field.name}</p>
        <p className="text-slate-600 text-xs font-mono">{field.type}</p>
      </div>
    </div>
  )
}

export default function FieldMapper({
  sourceLabel,
  targetLabel,
  sourceFields,
  targetFields,
  existingMappings = [],
  onSave,
}: FieldMapperProps) {
  const [mappings, setMappings] = useState<FieldMapping[]>(existingMappings)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const getMappedSource = (targetId: string) => {
    const m = mappings.find((x) => x.targetId === targetId)
    return m ? sourceFields.find((f) => f.id === m.sourceId) : undefined
  }

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { over, active } = event
      if (!over) return

      const dragData = active.data.current as { field: FieldDef; side: string } | undefined
      if (!dragData || dragData.side !== 'source') return

      const targetId = (over.id as string).replace('target::', '')

      setMappings((prev) => {
        const withoutExisting = prev.filter(
          (m) => m.sourceId !== dragData.field.id && m.targetId !== targetId
        )
        return [...withoutExisting, { sourceId: dragData.field.id, targetId }]
      })
    },
    []
  )

  const handleDragStart = (_e: DragStartEvent) => {}
  const handleDragOver = (_e: DragOverEvent) => {}

  const removeMapping = (targetId: string) => {
    setMappings((prev) => prev.filter((m) => m.targetId !== targetId))
  }

  const autoMap = () => {
    const auto: FieldMapping[] = []
    for (const src of sourceFields) {
      const match = targetFields.find(
        (t) =>
          t.name.toLowerCase() === src.name.toLowerCase() ||
          t.name.toLowerCase().includes(src.name.toLowerCase())
      )
      if (match) auto.push({ sourceId: src.id, targetId: match.id })
    }
    setMappings(auto)
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full bg-[#0B0F19]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E293B]">
          <h3 className="text-white font-semibold">Field Mapper</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={autoMap}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 border border-[#1E293B] hover:bg-[#1E293B] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Auto-map
            </button>
            <button
              onClick={() => onSave(mappings)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              Save Mapping
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-0 h-full">
            {/* Source fields column */}
            <div className="border-r border-[#1E293B] p-5">
              <h4 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">
                {sourceLabel} Fields
              </h4>
              <div className="space-y-2">
                {sourceFields.map((field) => (
                  <DraggableField key={field.id} field={field} side="source" />
                ))}
              </div>
            </div>

            {/* Target fields column */}
            <div className="p-5">
              <h4 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">
                {targetLabel} Fields — {mappings.length}/{targetFields.length} mapped
              </h4>
              <div className="space-y-2">
                {targetFields.map((field) => {
                  const mapped = getMappedSource(field.id)
                  return (
                    <div key={field.id} className="flex items-center gap-1">
                      <div className="flex-1">
                        <DroppableField field={field} mapping={mapped} />
                      </div>
                      {mapped && (
                        <button
                          onClick={() => removeMapping(field.id)}
                          className="p-1 text-slate-600 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="px-6 py-3 border-t border-[#1E293B] bg-[#0C1322]">
          <p className="text-slate-500 text-xs">
            {mappings.length} of {targetFields.length} target fields mapped
            {mappings.length < targetFields.length && ' — unmapped fields will be left blank'}
          </p>
        </div>
      </div>
    </DndContext>
  )
}
