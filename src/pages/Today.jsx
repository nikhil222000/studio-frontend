import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import PromptCard from '../components/PromptCard.jsx'

function StoryCard({ story, onFilled }) {
  const [building, setBuilding] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const build = async () => {
    setBuilding(true); setError(null)
    try {
      const r = await api.buildStory(story.id)
      setResult(r)
      if (r.status === 'built') onFilled?.()
    } catch (e) {
      setError(e.message)
    } finally {
      setBuilding(false)
    }
  }

  return (
    <div className="card-block">
      <div className="row-between">
        <div>
          <strong>{story.lines?.join(' ')}</strong>
          <div className="meta">{story.id} · photo: {story.photo}</div>
        </div>
        <button className="primary" onClick={build} disabled={building}>{building ? 'Building…' : 'Build story'}</button>
      </div>
      {result?.status === 'missing' && <p className="warn">Photo '{story.photo}' isn't in the inbox yet — check the Assets page.</p>}
      {result?.status === 'built' && <p className="success">Built. <Link to="/preview">Open the preview</Link></p>}
      {error && <p className="error">{error}</p>}
    </div>
  )
}

export default function Today() {
  const [today, setToday] = useState(null)
  const [prompts, setPrompts] = useState([])
  const [fresh, setFresh] = useState(false)
  const [building, setBuilding] = useState(false)
  const [buildResult, setBuildResult] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    const t = await api.today()
    setToday(t)
    if (t.postId) {
      const p = await api.postPrompts(t.postId)
      setPrompts(p.prompts)
    } else {
      setPrompts([])
    }
  }, [])

  useEffect(() => { setError(null); load().catch((e) => setError(e.message)) }, [load])

  const missing = prompts.filter((p) => !p.have)

  const build = async () => {
    setBuilding(true); setError(null); setBuildResult(null)
    try {
      const result = await api.buildPost(today.postId, fresh)
      setBuildResult(result)
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBuilding(false)
    }
  }

  // After an image is uploaded/generated, just refresh the missing-images
  // list and live previews — building is a separate, explicit action the
  // Build button triggers, never an automatic side effect of the last image
  // landing.
  const onImageFilled = async () => {
    const p = await api.postPrompts(today.postId)
    setPrompts(p.prompts)
  }

  if (error) return (
    <div className="empty">
      <p className="error">{error}</p>
      <button className="ghost" onClick={() => { setError(null); load().catch((e) => setError(e.message)) }}>Retry</button>
    </div>
  )
  if (!today) return <div className="empty"><p>Loading…</p></div>

  return (
    <div className="page">
      <h1>Today — {today.date}</h1>

      {!today.postId ? (
        <p>Nothing scheduled for today. <Link to="/calendar">Add it to the calendar</Link> or generate a plan.</p>
      ) : (
        <div className="card-block">
          <div className="row-between">
            <div>
              <h2>{today.post.title}</h2>
              <span className="meta">{today.postId} · {today.post.kind} · {today.post.slides.length} slide(s)</span>
            </div>
            <div className="row" style={{ gap: 12 }}>
              <label className="checkbox">
                <input type="checkbox" checked={fresh} onChange={(e) => setFresh(e.target.checked)} />
                Fresh (new photos)
              </label>
              <Link className="ghost" to={`/posts/${today.postId}`}>Edit</Link>
              <button className="primary" onClick={build} disabled={building}>
                {building ? 'Building…' : 'Build'}
              </button>
            </div>
          </div>

          {buildResult?.status === 'built' && (
            <p className="success">
              Built {buildResult.paths.length - 1} slide(s){buildResult.theme ? ` · 🎉 ${buildResult.theme.festival} theme applied` : ''}. <Link to="/preview">Open the preview</Link>
            </p>
          )}
          {buildResult?.status === 'missing' && (
            <p className="warn">Still missing {buildResult.missing.length} image(s) — fill them in below, then build again.</p>
          )}
          {buildResult?.warnings?.length > 0 && (
            <div className="overflow-warning">
              <strong>⚠ Content overflow detected:</strong>
              <ul>
                {buildResult.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {missing.length > 0 && (
        <div className="section">
          <h3>Images needed ({missing.length})</h3>
          {missing.map((item) => (
            <PromptCard key={item.key} item={item} onFilled={onImageFilled} />
          ))}
        </div>
      )}

      {today.suggestion && (
        <div className="section">
          <h3>Suggested next topic</h3>
          <div className="card-block">
            {today.suggestion.recentTitles.length > 0 && (
              <p className="meta">
                Recently posted: {today.suggestion.recentTitles.join(', ')}
                {today.suggestion.recentTopics.length > 0 && ` (topics: ${today.suggestion.recentTopics.join(', ')})`}
              </p>
            )}
            {today.suggestion.suggested ? (
              <div className="row-between">
                <div>
                  <strong>{today.suggestion.suggested.title}</strong>
                  <div className="meta">
                    {today.suggestion.suggested.id} · {today.suggestion.suggested.kind} · topics: {today.suggestion.suggested.topics.join(', ')}
                  </div>
                </div>
                <Link className="ghost" to={`/posts/${today.suggestion.suggested.id}`}>Open</Link>
              </div>
            ) : (
              <p className="meta">{today.suggestion.note}</p>
            )}
            {today.suggestion.suggested && <p className="meta" style={{ marginTop: 8 }}>{today.suggestion.note}</p>}
          </div>
        </div>
      )}

      <div className="section">
        <h3>Today's stories ({today.stories.length})</h3>
        {today.stories.length === 0 && <p className="meta">None scheduled — generate a plan on the Calendar page to fill these in.</p>}
        {today.stories.map((s, i) => <StoryCard key={s.id + i} story={s} onFilled={load} />)}
      </div>
    </div>
  )
}
