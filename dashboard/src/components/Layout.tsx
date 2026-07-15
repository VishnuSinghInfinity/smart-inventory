import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { ChatWidget } from './ChatWidget'

export function Layout() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <Sidebar collapsed={collapsed} />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <TopBar onToggle={() => setCollapsed(c => !c)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-7 lg:p-8">
          <div className="page-enter max-w-[1400px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
      <ChatWidget />
    </div>
  )
}
