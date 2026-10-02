import React, { useCallback, useEffect, useState } from 'react'
import { api } from '../api.js'
import PromptCard from '../components/PromptCard.jsx'

export default function Assets() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(() => { setError(null); return api.assets().then(setData).catch((e) => setError(e.message)) }, [])
  useEffect(() => { load() }, [load])

  if (error) return (
    <div className="empty">
      <p className="error">{error}</p>
      <button className="ghost" onClick={() => { setError(null); load() }}>Retry</button>
    </div>
  )
  if (!data) return <div className="empty"><p>Loading…</p></div>

  return (
    <div className="page">
      <h1>What's blocking you</h1>

      <div className="section">
        <h3>Screenshots to capture ({data.missingShots.length})</h3>
        {data.missingShots.length === 0 && <p className="meta">None — all captured.</p>}
        {data.missingShots.map((s) => (
          <div className="card-block" key={s.key}>
            <div className="row-between"><strong>{s.key}</strong><span className="meta">save as frontend/media/screens/{s.key}.jpeg</span></div>
            <p><b>Screen:</b> {s.screen}</p>
            <p><b>Capture:</b> {s.capture}</p>
            <p><b>Why:</b> {s.why}</p>
          </div>
        ))}
        {data.shotWarnings.length > 0 && (
          <>
            <h4>Worth redoing</h4>
            {data.shotWarnings.map((w) => <p key={w.key} className="warn"><b>{w.key}:</b> {w.warn}</p>)}
          </>
        )}
      </div>

      <div className="section">
        <h3>Images to generate ({data.missingPhotos.length})</h3>
        {data.missingPhotos.length === 0 && <p className="meta">None — all present.</p>}
        {data.missingPhotos.map((item) => <PromptCard key={item.key} item={item} onFilled={load} />)}
      </div>
    </div>
  )
}
