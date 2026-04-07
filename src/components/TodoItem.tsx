import { Todo, Priority } from '../types'
import { isPast, startOfDay } from 'date-fns'

interface TodoItemProps {
  todo: Todo
  onToggle: (id: string, completed: boolean) => void
  onUpdate: (id: string, updates: Partial<Todo>) => void
  onDelete: (id: string) => void
}

export default function TodoItem({ todo, onToggle, onUpdate, onDelete }: TodoItemProps) {
  const isOverdue = todo.due_date && isPast(startOfDay(new Date(todo.due_date))) && !todo.completed

  const getPriorityTheme = (p: Priority) => {
    switch (p) {
      case 'low': return 'bg-[#0B0F19] text-slate-400 border-[#1E293B] hover:bg-[#131B2B]'
      case 'medium': return 'bg-yellow-900/20 text-yellow-500 border-yellow-900/50 hover:bg-yellow-900/30'
      case 'high': return 'bg-red-900/20 text-red-400 border-red-900/50 hover:bg-red-900/30'
      default: return 'bg-[#0B0F19] text-slate-400 border-[#1E293B]'
    }
  }

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border transition-all duration-300 group ${
      isOverdue 
        ? 'border-red-900/50 bg-[#16111a] shadow-[0_0_15px_rgba(239,68,68,0.05)]' 
        : 'border-[#1E293B] bg-[#131B2B] hover:bg-[#1A2235] hover:border-[#334155] hover:shadow-[0_0_20px_rgba(37,99,235,0.05)]'
    }`}>
      
      {/* Title & Checkbox */}
      <div className="flex items-center flex-1 gap-4">
        <div className="relative flex items-center justify-center">
          <input
            id={`todo-${todo.id}`}
            type="checkbox"
            checked={todo.completed}
            onChange={() => onToggle(todo.id, todo.completed)}
            className="w-5 h-5 rounded border-[#334155] bg-[#0B0F19] text-[#60A5FA] focus:ring-[#60A5FA] focus:ring-offset-[#131B2B] focus:ring-2 cursor-pointer transition-colors appearance-none flex-shrink-0"
          />
          {todo.completed && (
            <svg className="absolute w-3 h-3 text-white pointer-events-none drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        
        <div className="flex flex-col flex-1 min-w-0">
          <label
            htmlFor={`todo-${todo.id}`}
            className={`flex items-center text-[15px] cursor-pointer select-none truncate transition-colors duration-200 ${
              todo.completed ? 'line-through text-slate-600' : 'text-slate-200 font-medium'
            }`}
          >
            {isOverdue && (
              <svg className="w-4 h-4 text-red-500 mr-2 flex-shrink-0 animate-pulse drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span className="truncate">{todo.title}</span>
          </label>
        </div>
      </div>

      {/* Due Date & Priority & Delete */}
      <div className="flex items-center gap-3 pl-9 sm:pl-0 mt-2 sm:mt-0">
        
        {/* Date Picker */}
        <div className="relative flex items-center group/date cursor-pointer">
          <input
            type="date"
            value={todo.due_date ? todo.due_date.split('T')[0] : ''}
            onChange={(e) => {
              const val = e.target.value ? new Date(e.target.value).toISOString() : null
              onUpdate(todo.id, { due_date: val })
            }}
            className={`text-xs px-2.5 py-1.5 rounded-lg border font-mono tracking-wider focus:outline-none transition-all cursor-pointer ${
              isOverdue 
                ? 'border-red-900/50 text-red-400 bg-red-900/10 focus:ring-1 focus:ring-red-500/50' 
                : 'border-[#1E293B] text-slate-400 bg-[#0B0F19] group-hover/date:border-[#334155] group-hover/date:text-slate-300 focus:ring-1 focus:ring-[#60A5FA]/50'
            }`}
          />
        </div>

        {/* Priority Filter */}
        <select
          value={todo.priority}
          onChange={(e) => onUpdate(todo.id, { priority: e.target.value as Priority })}
          className={`text-xs uppercase tracking-wider pl-2.5 pr-6 py-[7px] rounded-lg border appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#60A5FA]/50 font-bold transition-all relative ${getPriorityTheme(todo.priority)}`}
          style={{ backgroundImage: 'linear-gradient(45deg, transparent 50%, currentColor 50%), linear-gradient(135deg, currentColor 50%, transparent 50%)', backgroundPosition: 'calc(100% - 10px) calc(50% + 2px), calc(100% - 6px) calc(50% + 2px)', backgroundSize: '4px 4px, 4px 4px', backgroundRepeat: 'no-repeat' }}
        >
          <option value="low" className="font-semibold text-slate-300 bg-[#1A2235]">Low</option>
          <option value="medium" className="font-semibold text-slate-300 bg-[#1A2235]">Medium</option>
          <option value="high" className="font-semibold text-slate-300 bg-[#1A2235]">High</option>
        </select>

        {/* Delete */}
        <button
          type="button"
          onClick={() => {
            if (window.confirm('WARNING: Destroying process log. Confirm?')) {
              onDelete(todo.id)
            }
          }}
          aria-label={`Kill process: ${todo.title}`}
          className="flex-shrink-0 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 p-1.5 ml-1 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all duration-200"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

    </div>
  )
}
