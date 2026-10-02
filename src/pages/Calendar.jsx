import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'

function todayIso() { return new Date().toISOString().slice(0, 10) }

export default function CalendarPage() {
  const [from, setFrom] = useState(todayIso())
  const [days, setDays] = useState([])
  const [posts, setPosts] = useState({})
  const [weeks, setWeeks] = useState(8)
  const [write, setWrite] = useState(false)
  const [planResult, setPlanResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const load = async () => {
    const [w, p] = await Promise.all([api.week(from), api.posts()])
    setDays(w.days)
    setPosts(p.posts)
  }

  useEffect(() => { setError(null); load().catch((e) => setError(e.message)) }, [from])

  const assign = async (date, postId) => {
    await api.setCalendarSlot(date, postId)
    await load()
  }

  const generatePlan = async () => {
    setBusy(true); setError(null)
    try {
      const result = await api.plan({ weeks, write, start: from })
      setPlanResult(result)
      if (write) await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const postIds = Object.keys(posts)

  return (
    <div className="page">
      <h1>Calendar</h1>

      <div className="card-block">
        <div className="row" style={{ gap: 12, alignItems: 'flex-end' }}>
          <div className="field-row"><label>Week starting</label><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="field-row"><label>Plan weeks</label><input type="number" min={1} max={52} value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} style={{ width: 70 }} /></div>
          <label className="checkbox"><input type="checkbox" checked={write} onChange={(e) => setWrite(e.target.checked)} /> Write to calendar</label>
          <button className="primary" onClick={generatePlan} disabled={busy}>{busy ? 'Generating…' : 'Generate plan'}</button>
        </div>
        {planResult && (
          <div className="plan-result">
            <p>{planResult.slots} slot(s) planned from {planResult.start}. {planResult.written ? 'Written to the calendar.' : 'Preview only — check "Write to calendar" to save.'}</p>
            {planResult.notes.length > 0 && (
              <>
                <p className="warn">Festival slots that still need a post written:</p>
                <ul>{planResult.notes.map((n) => <li key={n}>{n}</li>)}</ul>
              </>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="error">{error} <button className="ghost" onClick={() => { setError(null); load().catch((e) => setError(e.message)) }}>Retry</button></p>
      )}

      <div className="week-grid">
        {days.map((d) => (
          <div className="week-day" key={d.date}>
            <div className="row-between">
              <div className="week-date">{d.date}</div>
              {d.kind && <span className="tag">{d.kind}</span>}
            </div>
            <select value={d.postId || ''} onChange={(e) => assign(d.date, e.target.value)}>
              <option value="">— none —</option>
              {postIds.map((pid) => <option key={pid} value={pid}>{pid}</option>)}
            </select>
            {d.postId && <Link className="ghost-link" to={`/posts/${d.postId}`}>{d.title}</Link>}
            {d.stories?.length > 0 && <div className="meta" style={{ marginTop: 8 }}>{d.stories.length} stories</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
