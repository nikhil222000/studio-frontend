import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'

function PostRow({ post }) {
  return (
    <li className="idea-row">
      <div className="idea-main">
        <div className="idea-tags">
          <span className="tag">{post.kind}</span>
          {post.missing > 0
            ? <span className="tag warn">{post.missing} / {post.total} images needed</span>
            : <span className="tag">all images ready</span>}
        </div>
        <div className="idea-hook">{post.title}</div>
        <div className="idea-show">{post.id}</div>
      </div>
      <div className="idea-actions">
        <Link className="ghost" to={`/posts/${encodeURIComponent(post.id)}`}>Open</Link>
      </div>
    </li>
  )
}

export default function Campaign() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const load = () => { setError(null); return api.campaign().then(setData).catch((e) => setError(e.message)) }
  useEffect(() => { load() }, [])

  if (error) return (
    <div className="empty">
      <p className="error">{error}</p>
      <button className="ghost" onClick={() => { setError(null); load() }}>Retry</button>
    </div>
  )
  if (!data) return <div className="empty"><p>Loading…</p></div>

  const allPosts = [
    ...data.phases.flatMap((p) => [...p.carousels, ...p.singles]),
    ...data.festivals,
  ]
  const totalMissing = allPosts.reduce((sum, p) => sum + (p.missing || 0), 0)

  return (
    <div className="page page-wide">
      <div className="row-between">
        <h1>Launch campaign</h1>
        <span className="meta">{allPosts.length} posts · {totalMissing} images still needed</span>
      </div>
      <p className="meta" style={{ marginBottom: 24 }}>
        Oct 1, 2026 – Jan 31, 2027. Open any post below to add its images and everything else, same as any other post.
      </p>

      {data.phases.map((phase) => (
        <div className="section" key={phase.name}>
          <h3>{phase.name} <span className="meta">· {phase.dates}</span></h3>
          <ul className="idea-list">
            {phase.carousels.map((p) => <PostRow key={p.id} post={p} />)}
            {phase.singles.map((p) => <PostRow key={p.id} post={p} />)}
          </ul>
        </div>
      ))}

      <div className="section">
        <h3>Festival moments <span className="meta">· 12 dedicated dates</span></h3>
        <ul className="idea-list">
          {data.festivals.map((p) => (
            <li className="idea-row" key={p.id}>
              <div className="idea-main">
                <div className="idea-tags">
                  <span className="tag">{p.date}</span>
                  <span className="tag">{p.kind}</span>
                  {p.missing > 0
                    ? <span className="tag warn">{p.missing} / {p.total} images needed</span>
                    : <span className="tag">all images ready</span>}
                </div>
                <div className="idea-hook">{p.title}</div>
                <div className="idea-show">{p.id}</div>
              </div>
              <div className="idea-actions">
                <Link className="ghost" to={`/posts/${encodeURIComponent(p.id)}`}>Open</Link>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
