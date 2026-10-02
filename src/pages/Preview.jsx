import React, { useCallback, useEffect, useState } from 'react'
import { api, API_BASE } from '../api.js'
import ShareModal from '../components/ShareModal.jsx'

const M = (p) => API_BASE + '/media/' + p
// Thumbnails (list/strip/grid) render at 40-240px on screen — fetching a small
// resize instead of the full 1080x1350 original keeps a page with a dozen+
// thumbnails from saturating the browser's per-origin connection limit, which
// was causing some of them to time out and never load.
const T = (p, w) => `${API_BASE}/thumb/${p}?w=${w}`

function useManifest() {
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const load = useCallback(() => {
    setErr(null)
    api.manifest().then(setData).catch((e) => setErr(e.message))
  }, [])
  useEffect(load, [load])
  return { data, err, reload: load }
}

function Carousel({ post }) {
  const [i, setI] = useState(0)
  useEffect(() => setI(0), [post.id])
  const n = post.slides.length

  const go = useCallback((d) => setI((v) => Math.min(n - 1, Math.max(0, v + d))), [n])

  useEffect(() => {
    const h = (e) => {
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [go])

  const story = post.kind === 'story'

  return (
    <div className="viewer">
      <div className={'frame' + (story ? ' story' : '')}>
        <img src={M(post.slides[i])} alt={post.id + ' slide ' + (i + 1)} />
        {n > 1 && (
          <>
            <button className="nav left" onClick={() => go(-1)} disabled={i === 0}>‹</button>
            <button className="nav right" onClick={() => go(1)} disabled={i === n - 1}>›</button>
            <div className="counter">{i + 1} / {n}</div>
          </>
        )}
      </div>

      {n > 1 && (
        <div className="dots">
          {post.slides.map((s, k) => (
            <button key={s} className={'dot' + (k === i ? ' on' : '')} onClick={() => setI(k)} />
          ))}
        </div>
      )}

      {n > 1 && (
        <div className="strip">
          {post.slides.map((s, k) => (
            <img key={s} src={T(s, 100)} className={k === i ? 'on' : ''}
                 onClick={() => setI(k)} alt={'slide ' + (k + 1)} />
          ))}
        </div>
      )}
    </div>
  )
}

function Caption({ post }) {
  const [copied, setCopied] = useState(false)
  const full = post.caption + (post.tags ? '\n\n' + post.tags : '')
  return (
    <div className="caption">
      <div className="caption-head">
        <span>Caption</span>
        <button onClick={() => {
          navigator.clipboard.writeText(full)
          setCopied(true); setTimeout(() => setCopied(false), 1400)
        }}>{copied ? 'Copied' : 'Copy'}</button>
      </div>
      <p>{post.caption}</p>
      {post.tags && <p className="tags">{post.tags}</p>}
    </div>
  )
}

function Grid({ posts, onPick }) {
  return (
    <div className="grid">
      {posts.map((p) => (
        <button key={p.id} className="cell" onClick={() => onPick(p.id)}>
          <img src={T(p.slides[0], 260)} alt={p.title} />
          {p.slides.length > 1 && <span className="badge">▣ {p.slides.length}</span>}
        </button>
      ))}
    </div>
  )
}

function formatDay(iso) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

// The posting history, grouped by the day each post was actually marked
// posted (most recent day first) — a record of what went out and when,
// distinct from the feed (what's queued to go out).
function PostedSeries({ posts, onPick }) {
  if (posts.length === 0) return <div className="empty"><p>Nothing marked as posted yet.</p></div>
  const groups = []
  for (const p of posts) {
    const day = (p.postedAt || '').slice(0, 10)
    const last = groups[groups.length - 1]
    if (last && last.day === day) last.posts.push(p)
    else groups.push({ day, posts: [p] })
  }
  return (
    <div className="posted-series">
      {groups.map((g) => (
        <div className="posted-day" key={g.day}>
          <div className="posted-day-head">{g.day ? formatDay(g.day) : 'Date unknown'}</div>
          <div className="posted-day-row">
            {g.posts.map((p) => (
              <button key={p.id} className="posted-card" onClick={() => onPick(p.id)}>
                <img src={T(p.slides[0], 200)} alt={p.title} />
                <div className="posted-card-meta">
                  <span className="posted-card-time">
                    {p.postedAt ? new Date(p.postedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : ''}
                  </span>
                  <span className="posted-card-title">{p.title}</span>
                  <span className="posted-card-kind">{p.kind}{p.slides.length > 1 ? ` · ${p.slides.length} slides` : ''}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function applyFiltersAndSort(posts, { search, kind, sortBy }) {
  let out = posts
  if (kind !== 'all') out = out.filter((p) => p.kind === kind)
  if (search.trim()) {
    const q = search.trim().toLowerCase()
    out = out.filter((p) => p.title.toLowerCase().includes(q) || p.id.toLowerCase().includes(q))
  }
  out = [...out]
  if (sortBy === 'date') {
    out.sort((a, b) => {
      const da = a.dates?.[0] ?? '9999', db = b.dates?.[0] ?? '9999'
      return da === db ? 0 : da.localeCompare(db)
    })
  } else if (sortBy === 'title') {
    out.sort((a, b) => a.title.localeCompare(b.title))
  }
  // sortBy === 'created' — the manifest already returns posts in creation order, leave as-is.
  return out
}

function applyFiltersOnly(posts, { search, kind }) {
  let out = posts
  if (kind !== 'all') out = out.filter((p) => p.kind === kind)
  if (search.trim()) {
    const q = search.trim().toLowerCase()
    out = out.filter((p) => p.title.toLowerCase().includes(q) || p.id.toLowerCase().includes(q))
  }
  // The posted tab's whole point is "in the order it actually happened" — always
  // most-recently-posted first, never re-orderable by the feed's creation/title sort.
  return [...out].sort((a, b) => (b.postedAt ?? '').localeCompare(a.postedAt ?? ''))
}

export default function Preview() {
  const { data, err, reload } = useManifest()
  const [sel, setSel] = useState(null)
  const [tab, setTab] = useState('feed')
  const [mode, setMode] = useState('single')
  const [sharing, setSharing] = useState(false)
  const [search, setSearch] = useState('')
  const [kindFilter, setKindFilter] = useState('all')
  const [sortBy, setSortBy] = useState('created')

  const feedPosts = (data?.posts ?? []).filter((p) => !p.posted)
  const postedPosts = (data?.posts ?? []).filter((p) => p.posted)
  const all = data ? [...data.posts, ...data.stories] : []
  const baseShown = tab === 'feed' ? feedPosts
    : tab === 'posted' ? postedPosts
    : tab === 'stories' ? (data?.stories ?? [])
    : []
  const filterable = tab === 'feed' || tab === 'posted'
  const shown = tab === 'posted' ? applyFiltersOnly(baseShown, { search, kind: kindFilter })
    : filterable ? applyFiltersAndSort(baseShown, { search, kind: kindFilter, sortBy })
    : baseShown
  const showSeries = tab === 'posted' && mode === 'series'

  useEffect(() => {
    if (!sel && shown.length) setSel(shown[0].id)
  }, [shown, sel])

  const post = all.find((p) => p.id === sel)

  const togglePosted = async () => {
    const nowPosted = !post.posted
    await api.setPosted(post.id, nowPosted)
    await reload()
    setTab(nowPosted ? 'posted' : 'feed')
  }

  const removePost = async () => {
    if (!confirm(`Delete '${post.id}'? This removes it and its built images. This cannot be undone.`)) return
    await api.deletePost(post.id)
    setSel(null)
    await reload()
  }

  if (err) return (
    <div className="empty">
      <h1>Nothing built yet</h1>
      <p>Build a post from the Today or Ideas page, then come back — or it may just be a transient load failure.</p>
      <p className="error">{err}</p>
      <button className="ghost" onClick={reload}>Retry</button>
    </div>
  )
  if (!data) return <div className="empty"><p>Loading…</p></div>

  return (
    <div className="preview-app">
      <aside>
        <header>
          <div className="brand"><span className="mark" />FitKarta</div>
          <button className="ghost" onClick={reload}>Refresh</button>
        </header>

        <nav className="tabs">
          {['feed', 'posted', 'stories', 'highlights'].map((t) => (
            <button key={t} className={tab === t ? 'on' : ''}
                    onClick={() => { setTab(t); setSel(null); setMode(t === 'posted' ? 'series' : 'single') }}>
              {t === 'feed' ? `Posts (${feedPosts.length})`
                : t === 'posted' ? `Posted (${postedPosts.length})`
                : t === 'stories' ? `Stories (${data.stories.length})`
                : `Covers (${data.highlights.length})`}
            </button>
          ))}
        </nav>

        {filterable && (
          <div className="list-filters">
            <input placeholder="search…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="row" style={{ gap: 6 }}>
              <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value)}>
                <option value="all">All kinds</option>
                <option value="single">Single</option>
                <option value="carousel">Carousel</option>
              </select>
              {tab === 'posted'
                ? <span className="meta" style={{ fontSize: 11 }}>Most recently posted first</span>
                : (
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="created">Creation order</option>
                    <option value="date">Scheduled date</option>
                    <option value="title">Title A–Z</option>
                  </select>
                )}
            </div>
          </div>
        )}

        <ul className="list">
          {shown.map((p, idx) => (
            <li key={p.id}>
              <button className={p.id === sel ? 'on' : ''} onClick={() => setSel(p.id)}>
                <img src={T(p.slides[0], 84)} alt="" />
                <div>
                  <div className="row">
                    <strong>Post {idx + 1}</strong>
                    <em>{p.kind}{p.slides.length > 1 ? ` · ${p.slides.length} slides` : ''}</em>
                  </div>
                  <span className="t">{p.title}</span>
                  {tab === 'posted'
                    ? (p.postedAt && <span className="d">posted {new Date(p.postedAt).toLocaleDateString()}</span>)
                    : (p.dates?.length > 0 && <span className="d">{p.dates[0]}</span>)}
                </div>
              </button>
            </li>
          ))}
          {shown.length === 0 && tab !== 'highlights' &&
            <li className="none">Nothing built in this tab yet.</li>}
        </ul>

        <footer>manifest {data.generated}</footer>
      </aside>

      <main>
        {tab === 'highlights' ? (
          <div className="covers">
            {data.highlights.map((h) => <img key={h} src={T(h, 160)} alt="" />)}
          </div>
        ) : showSeries ? (
          <>
            <div className="bar">
              <div>
                <h2>Posting history</h2>
                <span className="meta">{shown.length} post{shown.length === 1 ? '' : 's'} posted, most recent first</span>
              </div>
              <div className="seg">
                <button className="on">Series</button>
                <button onClick={() => setMode('single')} disabled={!shown.length}>Preview</button>
              </div>
            </div>
            <PostedSeries posts={shown} onPick={(id) => { setSel(id); setMode('single') }} />
          </>
        ) : !post ? (
          <div className="empty"><p>Pick a post.</p></div>
        ) : (
          <>
            <div className="bar">
              <div>
                <h2>{post.title}</h2>
                <span className="meta">
                  {post.id} · {post.kind}
                  {post.slides.length > 1 ? ` · ${post.slides.length} slides` : ''}
                  {tab === 'posted' && post.postedAt
                    ? ` · posted ${new Date(post.postedAt).toLocaleString()}`
                    : (post.dates?.length ? ` · scheduled ${post.dates.join(', ')}` : '')}
                </span>
              </div>
              <div className="row" style={{ gap: 10 }}>
                {tab !== 'stories' && tab !== 'highlights' && (
                  <>
                    <button className="primary" onClick={() => setSharing(true)}>Share</button>
                    <button className="ghost" onClick={togglePosted}>
                      {post.posted ? 'Unmark posted' : 'Mark as posted'}
                    </button>
                    <button className="ghost danger" onClick={removePost}>Delete</button>
                  </>
                )}
                <div className="seg">
                  {tab === 'posted' && <button onClick={() => setMode('series')}>Series</button>}
                  <button className={mode === 'single' ? 'on' : ''} onClick={() => setMode('single')}>Preview</button>
                  <button className={mode === 'grid' ? 'on' : ''} onClick={() => setMode('grid')}>Grid</button>
                </div>
              </div>
            </div>

            {mode === 'grid'
              ? <Grid posts={shown} onPick={(id) => { setSel(id); setMode('single') }} />
              : <><Carousel post={post} /><Caption post={post} /></>}

            {sharing && <ShareModal post={post} onClose={() => setSharing(false)} />}
          </>
        )}
      </main>
    </div>
  )
}
