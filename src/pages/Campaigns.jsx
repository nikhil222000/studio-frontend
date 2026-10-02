import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api.js'

const PLACEHOLDER = `[
  {
    "id": "diwali-protein-math",
    "pillar": "seasonal",
    "fmt": "stat",
    "hook": "The mithai math nobody does before Diwali",
    "show": "One laddoo's protein cost vs a katori of dal, side by side.",
    "layout": "stat",
    "photo": "a dark stone surface with one laddoo and a steel katori of dal",
    "care": null,
    "kind": "single"
  }
]`

export default function Campaigns() {
  const navigate = useNavigate()
  const [list, setList] = useState(null)
  const [error, setError] = useState(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [json, setJson] = useState('')
  const [createError, setCreateError] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = () => { setError(null); return api.campaigns().then((r) => setList(r.campaigns)).catch((e) => setError(e.message)) }
  useEffect(() => { load() }, [])

  const submit = async (e) => {
    e.preventDefault()
    setCreateError(null)
    let ideas
    try {
      ideas = JSON.parse(json)
    } catch (err) {
      setCreateError('Invalid JSON: ' + err.message)
      return
    }
    if (!Array.isArray(ideas) || ideas.length === 0) {
      setCreateError('JSON must be a non-empty array of ideas')
      return
    }
    setBusy(true)
    try {
      const campaign = await api.createCampaign(name, ideas)
      navigate(`/campaigns/${encodeURIComponent(campaign.id)}`)
    } catch (err) {
      // The backend names exactly which idea/field failed — surface it verbatim.
      setCreateError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (error) return (
    <div className="empty">
      <p className="error">{error}</p>
      <button className="ghost" onClick={load}>Retry</button>
    </div>
  )
  if (!list) return <div className="empty"><p>Loading…</p></div>

  return (
    <div className="page page-wide">
      <div className="row-between">
        <h1>Campaigns</h1>
        <button className="primary" onClick={() => setCreating((v) => !v)}>{creating ? 'Cancel' : '+ New campaign'}</button>
      </div>
      <p className="meta" style={{ marginBottom: 20 }}>
        Each idea in a campaign becomes a real, editable draft post immediately — same as "Single post" / "Carousel" on the Ideas page.
      </p>

      {creating && (
        <form className="card-block" onSubmit={submit}>
          <div className="field-row">
            <label>Campaign name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Diwali Flash Sale" required />
          </div>
          <div className="field-row">
            <label>Ideas — JSON array</label>
            <textarea rows={12} value={json} onChange={(e) => setJson(e.target.value)} placeholder={PLACEHOLDER} required
              style={{ fontFamily: 'monospace', fontSize: 12 }} />
          </div>
          {createError && <p className="error">{createError}</p>}
          <button className="primary" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create campaign'}</button>
        </form>
      )}

      <ul className="idea-list">
        {list.map((c) => (
          <li className="idea-row" key={c.id}>
            <div className="idea-main">
              <div className="idea-hook"><Link to={`/campaigns/${encodeURIComponent(c.id)}`}>{c.name}</Link></div>
              <div className="idea-show">{c.postCount} post{c.postCount === 1 ? '' : 's'} · created {new Date(c.createdAt).toLocaleDateString()}</div>
            </div>
            <div className="idea-actions">
              <Link className="ghost" to={`/campaigns/${encodeURIComponent(c.id)}`}>Open</Link>
            </div>
          </li>
        ))}
        {list.length === 0 && <li className="idea-row"><span className="meta">No campaigns yet — create one above.</span></li>}
      </ul>
    </div>
  )
}
