import { AppProvider, useAppStore } from './store/store.jsx'
import { Toast } from './components/ui/index.jsx'
import Sidebar from './components/layout/Sidebar.jsx'
import Dashboard from './components/views/dashboard/Dashboard.jsx'
import Projects from './components/views/projects/Projects.jsx'
import Importer from './components/views/importer/Importer.jsx'
import Settings from './components/views/settings/Settings.jsx'
import Preview  from './components/views/preview/Preview.jsx'
import Tutorial from './components/views/tutorial/Tutorial.jsx'

function Router() {
  const { state } = useAppStore()
  const views = {
    dashboard: <Dashboard />,
    projects:  <Projects />,
    importer:  <Importer />,
    settings:  <Settings />,
    preview:   <Preview />,
    tutorial:  <Tutorial />,
  }
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      <Sidebar />
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {views[state.view] || views.dashboard}
      </main>
      <Toast toast={state.toast} />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Router />
    </AppProvider>
  )
}
