import { create } from 'zustand'
import { Workspace, Project } from '../types/platform'

interface AppStore {
  workspace: Workspace | null
  projects: Project[]
  activeProject: Project | null
  setWorkspace: (w: Workspace) => void
  setProjects: (ps: Project[]) => void
  addProject: (p: Project) => void
  setActiveProject: (p: Project | null) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  removeProject: (id: string) => void
}

export const useStore = create<AppStore>((set) => ({
  workspace: null,
  projects: [],
  activeProject: null,
  setWorkspace: (workspace) => set({ workspace }),
  setProjects: (projects) => set({ projects }),
  addProject: (project) => set((s) => ({ projects: [project, ...s.projects] })),
  setActiveProject: (activeProject) => set({ activeProject }),
  updateProject: (id, updates) =>
    set((s) => ({
      projects: s.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      activeProject: s.activeProject?.id === id ? { ...s.activeProject, ...updates } : s.activeProject,
    })),
  removeProject: (id) =>
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
      activeProject: s.activeProject?.id === id ? null : s.activeProject,
    })),
}))

