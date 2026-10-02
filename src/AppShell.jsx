import React, { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { api } from './api.js'
import { clearToken } from './auth.js'

const TABS = [
  { to: '/today', label: 'Today' },
  { to: '/ideas', label: 'Ideas' },
  { to: '/campaigns', label: 'Campaigns' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/assets', label: 'Assets' },
  { to: '/preview', label: 'Preview' },
  { to: '/templates', label: 'Templates' },
]

export default function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  // AppShell stays mounted across route changes (only <Outlet> swaps), so the
  // mobile dropdown has to be closed explicitly on navigation — it won't
  // unmount on its own the way a full page reload would.
  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  const logout = () => {
    api.logout().catch(() => {}) // best-effort server-side revoke
    clearToken()
    window.location.reload() // simplest way to re-trigger App's auth check
  }

  return (
    <div className="shell">
      <header className="shell-topbar">
        <div className="brand"><span className="mark" />FitKarta Studio</div>
        <button className="shell-menu-btn" onClick={() => setMenuOpen((v) => !v)} aria-label="Toggle menu">
          {menuOpen ? '✕' : '☰'}
        </button>
      </header>
      <aside className={'shell-nav' + (menuOpen ? ' open' : '')}>
        <div className="brand"><span className="mark" />FitKarta Studio</div>
        <nav>
          {TABS.map((t) => (
            <NavLink key={t.to} to={t.to} className={({ isActive }) => isActive ? 'on' : ''}>{t.label}</NavLink>
          ))}
          <a href="#" onClick={(e) => { e.preventDefault(); logout() }}>Log out</a>
        </nav>
      </aside>
      <main className="shell-main">
        <Outlet />
      </main>
    </div>
  )
}
