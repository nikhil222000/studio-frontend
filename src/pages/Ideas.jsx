import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'

export default function Ideas() {
  const [data, setData] = useState({ ideas: [], pillars: [], formats: [] })
  const [pillar, setPillar] = useState('')
  const [fmt, setFmt] = useState('')
  const [q, setQ] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState(null)
  const [layouts, setLayouts] = useState([])
  const [customLayout, setCustomLayout] = useState({})
  const navigate = useNavigate()

  const loadIdeas = () => {
    setError(null)
    api.ideas({ pillar, fmt, q }).then(setData).catch((e) => setError(e.message))
  }
  useEffect(loadIdeas, [pillar, fmt, q])

  useEffect(() => {
    api.layouts().then((r) => setLayouts(r.layouts)).catch(() => {})
  }, [])

  const turnIntoPost = async (ideaId, kind) => {
    setBusyId(ideaId); setError(null)
    try {
      const { id } = await api.createFromIdea(ideaId, kind)
      navigate(`/posts/${id}`)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusyId(null)
    }
  }

  const useTemplate = async (ideaId) => {
    const layout = customLayout[ideaId] || layouts[0]
    setBusyId(ideaId); setError(null)
    try {
      const { id } = await api.createCustomFromIdea(ideaId, layout)
      navigate(`/posts/${id}`)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="page">
      <h1>Idea bank</h1>
      <div className="filters">
        <select value={pillar} onChange={(e) => setPillar(e.target.value)}>
          <option value="">All pillars</option>
          {data.pillars.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={fmt} onChange={(e) => setFmt(e.target.value)}>
          <option value="">All formats</option>
          {data.formats.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <input placeholder="search…" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="meta">{data.total} idea(s)</span>
      </div>
      {error && (
        <p className="error">{error} <button className="ghost" onClick={loadIdeas}>Retry</button></p>
      )}

      <ul className="idea-list">
        {data.ideas.map((i) => (
          <li key={i.id} className="idea-row">
            <div className="idea-main">
              <div className="idea-tags">
                <span className="tag">{i.pillar}</span>
                <span className="tag">{i.fmt}</span>
                {i.care && <span className="tag warn">care</span>}
              </div>
              <div className="idea-hook">{i.hook}</div>
              <div className="idea-show">{i.show}</div>
            </div>
            <div className="idea-actions">
              <button className="ghost" disabled={busyId === i.id} onClick={() => turnIntoPost(i.id, 'single')}>
                Single post
              </button>
              <button className="ghost" disabled={busyId === i.id} onClick={() => turnIntoPost(i.id, 'carousel')}>
                Carousel
              </button>
              <div className="template-picker">
                <select
                  value={customLayout[i.id] || i.layout}
                  onChange={(e) => setCustomLayout((m) => ({ ...m, [i.id]: e.target.value }))}
                >
                  {layouts.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
                <button className="ghost" disabled={busyId === i.id} onClick={() => useTemplate(i.id)}>
                  Use this template
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
