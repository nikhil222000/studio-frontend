import React, { useEffect, useState } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ConfigProvider } from './ConfigContext.jsx'
import AppShell from './AppShell.jsx'
import Login from './pages/Login.jsx'
import Today from './pages/Today.jsx'
import Ideas from './pages/Ideas.jsx'
import Campaigns from './pages/Campaigns.jsx'
import CampaignDetail from './pages/CampaignDetail.jsx'
import PostEditor from './pages/PostEditor.jsx'
import CalendarPage from './pages/Calendar.jsx'
import Assets from './pages/Assets.jsx'
import Preview from './pages/Preview.jsx'
import Templates from './pages/Templates.jsx'
import { api, AUTH_EVENT } from './api.js'
import { getToken } from './auth.js'

export default function App() {
  // null = still checking the stored token; false = show the login screen;
  // true = token verified, render the real app.
  const [authed, setAuthed] = useState(null)

  useEffect(() => {
    const token = getToken()
    if (!token) { setAuthed(false); return }
    api.authCheck().then((r) => setAuthed(!!r.ok)).catch(() => setAuthed(false))
  }, [])

  // api.js dispatches this the moment any request comes back 401 (expired or
  // revoked token) — drop back to the login screen immediately rather than
  // leaving the app showing stale data the user can no longer fetch.
  useEffect(() => {
    const onUnauthorized = () => setAuthed(false)
    window.addEventListener(AUTH_EVENT, onUnauthorized)
    return () => window.removeEventListener(AUTH_EVENT, onUnauthorized)
  }, [])

  if (authed === null) return null
  if (!authed) return <Login onLogin={() => setAuthed(true)} />

  return (
    <ConfigProvider>
      <HashRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/today" replace />} />
            <Route path="/today" element={<Today />} />
            <Route path="/ideas" element={<Ideas />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/campaigns/:id" element={<CampaignDetail />} />
            <Route path="/posts/:id" element={<PostEditor />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/assets" element={<Assets />} />
            <Route path="/preview" element={<Preview />} />
            <Route path="/templates" element={<Templates />} />
          </Route>
        </Routes>
      </HashRouter>
    </ConfigProvider>
  )
}
