import React from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ConfigProvider } from './ConfigContext.jsx'
import AppShell from './AppShell.jsx'
import Today from './pages/Today.jsx'
import Ideas from './pages/Ideas.jsx'
import Campaigns from './pages/Campaigns.jsx'
import CampaignDetail from './pages/CampaignDetail.jsx'
import PostEditor from './pages/PostEditor.jsx'
import CalendarPage from './pages/Calendar.jsx'
import Assets from './pages/Assets.jsx'
import Preview from './pages/Preview.jsx'
import Templates from './pages/Templates.jsx'

export default function App() {
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
