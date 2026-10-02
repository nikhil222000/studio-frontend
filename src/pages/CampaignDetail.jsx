import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
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

export default function CampaignDetail() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const load = () => { setError(null); setData(null); return api.campaign(id).then(setData).catch((e) => setError(e.message)) }
  // The route is /campaigns/:id — switching between campaigns keeps this
  // component mounted, so state has to reset explicitly on id change (same
  // stale-state class of bug fixed earlier on the post editor's route).
  useEffect(() => { load() }, [id])

  if (error) return (
    <div className="empty">
      <p className="error">{error}</p>
      <button className="ghost" onClick={load}>Retry</button>
    </div>
  )
  if (!data) return <div className="empty"><p>Loading…</p></div>

  const totalMissing = data.posts.reduce((sum, p) => sum + p.missing, 0)

  return (
    <div className="page page-wide">
      <div className="row-between">
        <div>
          <h1>{data.name}</h1>
          <span className="meta">{data.posts.length} post{data.posts.length === 1 ? '' : 's'} · {totalMissing} images still needed</span>
        </div>
        <Link className="ghost" to="/campaigns">← All campaigns</Link>
      </div>

      <ul className="idea-list" style={{ marginTop: 24 }}>
        {data.posts.map((p) => <PostRow key={p.id} post={p} />)}
        {data.posts.length === 0 && <li className="idea-row"><span className="meta">No posts in this campaign.</span></li>}
      </ul>
    </div>
  )
}
