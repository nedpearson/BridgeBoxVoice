/* eslint-disable */
import { useState, useCallback } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Plus, MoreHorizontal, GripVertical } from 'lucide-react'

export interface KanbanCard {
  id: string
  title: string
  description?: string
  priority?: 'low' | 'medium' | 'high'
  assignee?: string
  tags?: string[]
}

export interface KanbanColumn {
  id: string
  title: string
  color: string
  cards: KanbanCard[]
}

interface KanbanBoardProps {
  title?: string
  initialColumns?: KanbanColumn[]
  onUpdate?: (columns: KanbanColumn[]) => void
}

const PRIORITY_COLORS = {
  high: 'bg-red-500/20 text-red-400',
  medium: 'bg-amber-500/20 text-amber-400',
  low: 'bg-slate-700 text-slate-400',
}

function DraggableCard({ card }: { card: KanbanCard }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    data: { card },
  })
  const style = { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1 }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="group bg-[#0D1526] border border-[#1E293B] rounded-xl p-3 cursor-grab active:cursor-grabbing hover:border-blue-500/30 transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-white text-xs font-medium flex-1">{card.title}</p>
        <div {...listeners} className="text-slate-600 hover:text-slate-400 cursor-grab mt-0.5">
          <GripVertical className="w-3.5 h-3.5" />
        </div>
      </div>
      {card.description && (
        <p className="text-slate-500 text-xs mt-1 line-clamp-2">{card.description}</p>
      )}
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {card.priority && (
          <span className={`px-1.5 py-0.5 rounded text-xs ${PRIORITY_COLORS[card.priority]}`}>
            {card.priority}
          </span>
        )}
        {card.tags?.map((t) => (
          <span key={t} className="px-1.5 py-0.5 rounded bg-[#1E293B] text-slate-400 text-xs">
            {t}
          </span>
        ))}
        {card.assignee && (
          <div className="ml-auto w-5 h-5 rounded-full bg-blue-500/30 text-blue-400 text-xs flex items-center justify-center font-bold">
            {card.assignee[0].toUpperCase()}
          </div>
        )}
      </div>
    </div>
  )
}

function DroppableColumn({ column, children }: { column: KanbanColumn; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id: column.id })
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[220px] max-w-xs flex flex-col rounded-2xl transition-colors ${
        isOver ? 'bg-blue-500/5' : ''
      }`}
    >
      {children}
    </div>
  )
}

const DEFAULT_COLUMNS: KanbanColumn[] = [
  {
    id: 'todo', title: 'To Do', color: '#64748B',
    cards: [
      { id: 'c1', title: 'Design user authentication flow', priority: 'high', tags: ['UX', 'Auth'] },
      { id: 'c2', title: 'Set up CI/CD pipeline', priority: 'medium', tags: ['DevOps'] },
      { id: 'c3', title: 'Write API documentation', priority: 'low', assignee: 'John' },
    ],
  },
  {
    id: 'inprogress', title: 'In Progress', color: '#3B82F6',
    cards: [
      { id: 'c4', title: 'Build dashboard analytics', priority: 'high', description: 'Metrics, charts, and KPI widgets', assignee: 'You', tags: ['Frontend'] },
      { id: 'c5', title: 'Integrate Stripe payments', priority: 'high', assignee: 'Sam', tags: ['Backend'] },
    ],
  },
  {
    id: 'review', title: 'Review', color: '#F59E0B',
    cards: [
      { id: 'c6', title: 'Mobile responsive layout', priority: 'medium', assignee: 'Lisa', tags: ['CSS'] },
    ],
  },
  {
    id: 'done', title: 'Done', color: '#10B981',
    cards: [
      { id: 'c7', title: 'Project scaffolding', priority: 'low', tags: ['Setup'] },
      { id: 'c8', title: 'Database schema design', priority: 'high', assignee: 'You', tags: ['DB'] },
    ],
  },
]

export default function KanbanBoard({ title = 'Project Board', initialColumns = DEFAULT_COLUMNS, onUpdate }: KanbanBoardProps) {
  const [columns, setColumns] = useState<KanbanColumn[]>(initialColumns)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const findCardColumn = (cardId: string) => columns.find((col) => col.cards.some((c) => c.id === cardId))

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const sourceCol = findCardColumn(active.id as string)
    const targetColId = columns.find((c) => c.id === over.id)?.id ?? findCardColumn(over.id as string)?.id

    if (!sourceCol || !targetColId || sourceCol.id === targetColId) return

    setColumns((prev) => {
      const card = sourceCol.cards.find((c) => c.id === active.id)!
      const next = prev.map((col) => {
        if (col.id === sourceCol.id) return { ...col, cards: col.cards.filter((c) => c.id !== active.id) }
        if (col.id === targetColId) return { ...col, cards: [...col.cards, card] }
        return col
      })
      onUpdate?.(next)
      return next
    })
  }, [columns, onUpdate])

  const handleDragStart = (_e: DragEndEvent) => {}
  const handleDragOver = (_e: DragOverEvent) => {}

  return (
    <div className="flex flex-col h-full">
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold text-sm">{title}</h3>
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white border border-[#1E293B] hover:bg-[#1E293B] transition-colors">
            <Plus className="w-3.5 h-3.5" />
            Add Card
          </button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4 flex-1">
          {columns.map((col) => (
            <DroppableColumn key={col.id} column={col}>
              {/* Column header */}
              <div className="flex items-center justify-between px-3 py-2.5 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                  <span className="text-slate-300 text-xs font-semibold">{col.title}</span>
                  <span className="text-slate-600 text-xs">{col.cards.length}</span>
                </div>
                <button className="text-slate-600 hover:text-slate-400 transition-colors">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>

              {/* Cards */}
              <div className="flex-1 space-y-2 px-1">
                {col.cards.map((card) => (
                  <DraggableCard key={card.id} card={card} />
                ))}
              </div>

              {/* Add card */}
              <button className="mt-2 mx-1 px-3 py-2 rounded-xl text-slate-600 hover:text-slate-400 text-xs flex items-center gap-1.5 hover:bg-[#1E293B] transition-colors w-full">
                <Plus className="w-3.5 h-3.5" />
                Add card
              </button>
            </DroppableColumn>
          ))}
        </div>
      </DndContext>
    </div>
  )
}
