/**
 * store.js — Estado global da aplicação com React Context + useReducer.
 *
 * Evita prop drilling em uma árvore profunda.
 * API exposta via useAppStore() hook.
 */

import { createContext, useContext, useReducer, useCallback, useEffect } from 'react'

const AppContext = createContext(null)

const initialState = {
  // Navegação
  view:           'dashboard',   // dashboard | projects | importer | settings | preview
  activeProjectId: null,

  // Dados carregados
  projects:  [],
  boards:    [],
  templates: [],
  settings:  {},
  aiProviders: [],

  // UI
  loading:   {},   // { [key]: boolean }
  errors:    {},   // { [key]: string }
  toast:     null, // { type: 'success'|'error'|'info', message }
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, view: action.view, activeProjectId: action.projectId ?? state.activeProjectId }

    case 'SET_PROJECTS':    return { ...state, projects:    action.projects }
    case 'SET_BOARDS':      return { ...state, boards:      action.boards }
    case 'SET_TEMPLATES':   return { ...state, templates:   action.templates }
    case 'SET_SETTINGS':    return { ...state, settings:    action.settings }
    case 'SET_AI_PROVIDERS':return { ...state, aiProviders: action.providers }

    case 'UPDATE_PROJECT': return {
      ...state,
      projects: state.projects.map(p => p.id === action.id ? { ...p, ...action.fields } : p),
    }
    case 'DELETE_PROJECT': return {
      ...state,
      projects: state.projects.filter(p => p.id !== action.id),
      activeProjectId: state.activeProjectId === action.id ? null : state.activeProjectId,
    }
    case 'ADD_PROJECT': return { ...state, projects: [action.project, ...state.projects] }

    case 'SET_LOADING': return { ...state, loading: { ...state.loading, [action.key]: action.value } }
    case 'SET_ERROR':   return { ...state, errors:  { ...state.errors,  [action.key]: action.value } }
    case 'SET_TOAST':   return { ...state, toast: action.toast }
    case 'CLEAR_TOAST': return { ...state, toast: null }

    default: return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // ── Carregamento inicial ───────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      if (!window.api) return
      const [projects, boards, templates, settings, aiProviders] = await Promise.all([
        window.api.projects.list(),
        window.api.boards.getLocal(),
        window.api.templates.list(),
        window.api.settings.getAll(),
        window.api.ai.getProviders(),
      ])
      dispatch({ type: 'SET_PROJECTS',     projects  })
      dispatch({ type: 'SET_BOARDS',       boards    })
      dispatch({ type: 'SET_TEMPLATES',    templates })
      dispatch({ type: 'SET_SETTINGS',     settings  })
      dispatch({ type: 'SET_AI_PROVIDERS', providers: aiProviders })
    }
    load()
  }, [])

  // ── Actions ───────────────────────────────────────────────────────────────
  const navigate = useCallback((view, projectId) => {
    dispatch({ type: 'SET_VIEW', view, projectId })
  }, [])

  const showToast = useCallback((type, message, duration = 3000) => {
    dispatch({ type: 'SET_TOAST', toast: { type, message } })
    setTimeout(() => dispatch({ type: 'CLEAR_TOAST' }), duration)
  }, [])

  const setLoading = useCallback((key, value) => {
    dispatch({ type: 'SET_LOADING', key, value })
  }, [])

  const refreshProjects = useCallback(async () => {
    if (!window.api) return
    const projects = await window.api.projects.list()
    dispatch({ type: 'SET_PROJECTS', projects })
  }, [])

  const refreshBoards = useCallback(async () => {
    if (!window.api) return
    const boards = await window.api.boards.getLocal()
    dispatch({ type: 'SET_BOARDS', boards })
  }, [])

  const refreshSettings = useCallback(async () => {
    if (!window.api) return
    const settings = await window.api.settings.getAll()
    dispatch({ type: 'SET_SETTINGS', settings })
    const providers = await window.api.ai.getProviders()
    dispatch({ type: 'SET_AI_PROVIDERS', providers })
  }, [])

  return (
    <AppContext.Provider value={{ state, dispatch, navigate, showToast, setLoading, refreshProjects, refreshBoards, refreshSettings }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppStore() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppStore deve ser usado dentro de AppProvider')
  return ctx
}
