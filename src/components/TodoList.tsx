import { useState, useEffect, FormEvent } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Todo, Priority } from '../types'
import TodoItem from './TodoItem'
import { toast } from 'react-hot-toast'
import { isPast, startOfDay } from 'date-fns'

interface TodoListProps {
  session: Session
}

type StatusFilter = 'All' | 'Active' | 'Completed' | 'Overdue'

export default function TodoList({ session }: TodoListProps) {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loadingInitial, setLoadingInitial] = useState(true)
  
  const [newTodoTitle, setNewTodoTitle] = useState('')
  const [loadingAdd, setLoadingAdd] = useState(false)
  const [loadingSignOut, setLoadingSignOut] = useState(false)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All')
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all')

  const fetchTodos = async () => {
    try {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTodos(data as Todo[])
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error('Error fetching todos:', err.message)
        toast.error('Failed to load tasks.')
      }
    } finally {
      setLoadingInitial(false)
    }
  }

  useEffect(() => {
    fetchTodos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addTodo = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const title = newTodoTitle.trim()
    if (!title) return

    setLoadingAdd(true)

    const tempId = `temp-${Date.now()}`
    const optimisticTodo: Todo = {
      id: tempId,
      title,
      completed: false,
      user_id: session.user.id,
      created_at: new Date().toISOString(),
      due_date: null,
      priority: 'medium'
    }
    
    setTodos((prev) => [optimisticTodo, ...prev])
    setNewTodoTitle('')

    try {
      const { data, error } = await supabase
        .from('todos')
        .insert({ 
          title, 
          user_id: session.user.id, 
          completed: false,
          priority: 'medium'
        })
        .select()
        .single()

      if (error) throw error
      setTodos((prev) => prev.map((t) => (t.id === tempId ? (data as Todo) : t)))
      toast.success('Task recorded')
    } catch (err: unknown) {
      setTodos((prev) => prev.filter((t) => t.id !== tempId))
      setNewTodoTitle(title)
      if (err instanceof Error) toast.error('Failed to record task.')
    } finally {
      setLoadingAdd(false)
    }
  }

  const toggleTodo = async (id: string, currentCompleted: boolean) => {
    const newCompleted = !currentCompleted
    
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: newCompleted } : t))
    )

    try {
      const { error } = await supabase
        .from('todos')
        .update({ completed: newCompleted })
        .eq('id', id)
        .eq('user_id', session.user.id)

      if (error) throw error
      if (newCompleted) toast.success('Task finalized')
    } catch (err: unknown) {
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed: currentCompleted } : t))
      )
      if (err instanceof Error) toast.error('Failed to update status.')
    }
  }

  const updateTodo = async (id: string, updates: Partial<Todo>) => {
    const existing = todos.find(t => t.id === id)
    if (!existing) return
    
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    )

    try {
      const { error } = await supabase
        .from('todos')
        .update(updates)
        .eq('id', id)
        .eq('user_id', session.user.id)

      if (error) throw error
      toast.success('Configuration updated')
    } catch (err: unknown) {
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? existing : t))
      )
      if (err instanceof Error) toast.error('Failed to update task.')
    }
  }

  const deleteTodo = async (id: string) => {
    const deletedTodo = todos.find((t) => t.id === id)
    setTodos((prev) => prev.filter((t) => t.id !== id))

    try {
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id)
        .eq('user_id', session.user.id)

      if (error) throw error
      toast.success('Task deleted')
    } catch (err: unknown) {
      if (deletedTodo) {
        setTodos((prev) => {
          const newList = [...prev]
          newList.splice(0, 0, deletedTodo)
          return newList
        })
      }
      if (err instanceof Error) toast.error('Failed to delete task.')
    }
  }

  const signOut = async () => {
    setLoadingSignOut(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (err: unknown) {
      if (err instanceof Error) toast.error('Failed to sign out.')
    } finally {
      setLoadingSignOut(false)
    }
  }

  const getPriorityWeight = (p: Priority) => {
    if (p === 'high') return 3
    if (p === 'medium') return 2
    return 1
  }

  const checkIsOverdue = (t: Todo) => t.due_date && isPast(startOfDay(new Date(t.due_date))) && !t.completed

  const filteredAndSortedTodos = todos
    .filter((t) => {
      if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
      if (statusFilter === 'Active' && t.completed) return false
      if (statusFilter === 'Completed' && !t.completed) return false
      if (statusFilter === 'Overdue' && !checkIsOverdue(t)) return false
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false
      return true
    })
    .sort((a, b) => {
      const aOverdue = checkIsOverdue(a)
      const bOverdue = checkIsOverdue(b)
      if (aOverdue && !bOverdue) return -1
      if (!aOverdue && bOverdue) return 1

      const pWeightDiff = getPriorityWeight(b.priority) - getPriorityWeight(a.priority)
      if (pWeightDiff !== 0) return pWeightDiff

      if (a.due_date && !b.due_date) return -1
      if (!a.due_date && b.due_date) return 1
      if (a.due_date && b.due_date) {
        const d1 = new Date(a.due_date).getTime()
        const d2 = new Date(b.due_date).getTime()
        if (d1 !== d2) return d1 - d2
      }

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  const hasActiveFilters = searchQuery !== '' || statusFilter !== 'All' || priorityFilter !== 'all'
  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('All')
    setPriorityFilter('all')
  }

  return (
    <div className="min-h-screen bg-transparent flex flex-col">
      <header className="bg-[#131B2B]/90 backdrop-blur-lg border-b border-[#1E293B] sticky top-0 z-20 shadow-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 shadow-lg">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#60A5FA" strokeWidth="2.5" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="#60A5FA" strokeWidth="2.5" strokeLinejoin="round"/>
                <path d="M2 12V17" stroke="#60A5FA" strokeWidth="2.5" strokeLinejoin="round"/>
                <path d="M22 12V17" stroke="#60A5FA" strokeWidth="2.5" strokeLinejoin="round"/>
                <path d="M12 12V22" stroke="#60A5FA" strokeWidth="2.5" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Bridgebox Voice <span className="text-[#60A5FA] bg-[#1E293B] px-1.5 py-0.5 rounded text-xs">AI</span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[180px] sm:max-w-full font-mono">{session.user.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={signOut}
            disabled={loadingSignOut}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white hover:bg-[#1E293B] px-3 py-2 rounded-xl transition disabled:opacity-60 disabled:cursor-not-allowed font-medium"
          >
            {loadingSignOut ? (
              <div className="spinner spinner-blue" />
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            )}
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full">
        
        {/* Universal Input Bar */}
        <form onSubmit={addTodo} className="mb-8 relative z-10 scale-100 hover:scale-[1.01] transition-transform duration-300">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <span className="text-blue-500 font-bold text-xl">+</span>
            </div>
            <input
              type="text"
              value={newTodoTitle}
              onChange={(e) => setNewTodoTitle(e.target.value)}
              placeholder="Deploy a new intelligent workflow..."
              disabled={loadingAdd}
              className="w-full pl-12 pr-32 py-5 bg-[#131B2B] border border-[#1E293B] rounded-2xl text-lg text-white shadow-2xl focus:outline-none focus:ring-4 focus:ring-blue-600/20 focus:border-blue-500 transition-all placeholder-slate-500 disabled:opacity-60"
            />
            <div className="absolute inset-y-0 right-2 flex items-center">
              <button
                type="submit"
                disabled={loadingAdd || !newTodoTitle.trim()}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.3)] transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {loadingAdd ? <div className="spinner" /> : <span>Execute</span>}
              </button>
            </div>
          </div>
        </form>

        {/* Global Control Panel */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-[#131B2B] p-3 sm:p-4 rounded-2xl border border-[#1E293B] shadow-lg">
          
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input 
              type="text" 
              placeholder="Query systems..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-[#0B0F19] text-white border border-[#1E293B] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl outline-none transition-all placeholder-slate-600"
            />
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide shrink-0">
            <div className="flex p-1 bg-[#0B0F19] rounded-xl border border-[#1E293B]">
              {(['All', 'Active', 'Completed', 'Overdue'] as StatusFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    statusFilter === f 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E293B]'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as Priority | 'all')}
              className="text-xs font-semibold px-3 py-2.5 bg-[#0B0F19] border border-[#1E293B] text-slate-300 rounded-xl hover:bg-[#1E293B] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer transition-colors"
            >
              <option value="all">All Priorities</option>
              <option value="high">Critical</option>
              <option value="medium">Standard</option>
              <option value="low">Backlog</option>
            </select>
          </div>
        </div>

        {/* System Operations Stream */}
        {!loadingInitial && (
          <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="text-sm font-semibold text-slate-400 font-mono tracking-tight uppercase">
              {filteredAndSortedTodos.length} {filteredAndSortedTodos.length === 1 ? 'operation logged' : 'operations logged'}
            </h2>
            {hasActiveFilters && (
              <button 
                onClick={clearFilters}
                className="text-xs text-[#60A5FA] hover:text-[#93C5FD] font-semibold flex items-center gap-1 transition-colors bg-blue-900/20 px-2.5 py-1 rounded-md border border-blue-900/50"
              >
                Reset query
              </button>
            )}
          </div>
        )}

        {loadingInitial ? (
          <div className="flex flex-col items-center justify-center py-32 gap-5">
            <div className="spinner spinner-blue" style={{ width: 44, height: 44, borderWidth: 4 }} />
            <p className="text-[#60A5FA] font-mono text-sm uppercase tracking-widest animate-pulse">Establishing secure link...</p>
          </div>
        ) : filteredAndSortedTodos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center border border-[#1E293B] rounded-2xl bg-[#131B2B]">
            <div className="w-16 h-16 rounded-2xl bg-[#1E293B] flex items-center justify-center border border-[#334155]">
              <svg className="w-8 h-8 text-[#60A5FA]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-bold text-lg">System Idle</p>
              <p className="text-slate-500 mt-1 max-w-sm mx-auto text-sm">
                {hasActiveFilters ? "Query parameters yielded null results. Try adjusting the scope." : "No active workflows detected. Execute a new command above to initialize."}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredAndSortedTodos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onToggle={toggleTodo}
                onUpdate={updateTodo}
                onDelete={deleteTodo}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
