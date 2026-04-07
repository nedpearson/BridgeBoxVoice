export type Priority = 'low' | 'medium' | 'high'

export interface Todo {
  id: string
  title: string
  completed: boolean
  user_id: string
  created_at: string
  
  // Phase 1 Additions
  due_date: string | null
  priority: Priority
}
