import React, { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'

// Every slide on the page has its own SlidePreview instance, and each one's
// render is a real Playwright page render on the server, not a cheap static
// fetch — opening an 8-slide post and letting all 8 fire at once is exactly
// what exhausts the browser's 6-connections-per-origin limit and can strand
// a plain data GET (post/prompts) behind them, timing it out. A shared,
// module-level queue caps how many of these are ever in flight at once,
// regardless of how many SlidePreview instances exist on the page.
const MAX_CONCURRENT_RENDERS = 2
let activeRenders = 0
const renderQueue = []

function pump() {
  while (activeRenders < MAX_CONCURRENT_RENDERS && renderQueue.length > 0) {
    const job = renderQueue.shift()
    activeRenders++
    job().finally(() => { activeRenders--; pump() })
  }
}

export function queueRender(fn) {
  return new Promise((resolve, reject) => {
    renderQueue.push(() => fn().then(resolve, reject))
    pump()
  })
}

// Live preview canvas: re-renders the actual slide template (server-side,
// same engine used for the real build) whenever `slide` changes, debounced so
// typing doesn't fire a render per keystroke.
//
// `ready` (default true) tells this component whether the slide's photo(s)
// actually exist yet — the caller knows this from the post's own prompt
// list. A slide with a missing photo is guaranteed to fail render with a 422,
// so skipping the attempt entirely avoids burning a queue slot and a network
// round-trip on a request that can't succeed, and shows a clear "waiting for
// photo" state instead of a confusing render error.
//
// `refreshKey` forces a re-render even when the slide JSON itself hasn't
// changed — needed because uploading/generating an image changes a file on
// disk, not the slide object, so the JSON-based dependency below wouldn't
// otherwise notice the photo now exists.
export default function SlidePreview({ slide, n, total, refreshKey, ready = true }) {
  const [src, setSrc] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [overflow, setOverflow] = useState([])
  const urlRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    clearTimeout(timerRef.current)
    if (!ready) {
      setLoading(false); setError(null)
      return
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true); setError(null)
      const attempt = () => queueRender(() => api.renderPreview(slide, n, total))
      try {
        let result
        try {
          result = await attempt()
        } catch (e) {
          // One retry: a request that lands right as the connection pool is
          // saturated can be dropped outright rather than queued — a short
          // wait and a second try clears that without surfacing a false error.
          await new Promise((r) => setTimeout(r, 700))
          result = await attempt()
        }
        if (urlRef.current) URL.revokeObjectURL(urlRef.current)
        urlRef.current = result.url
        setSrc(result.url)
        setOverflow(result.overflow)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }, 500)
    return () => clearTimeout(timerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(slide), n, total, refreshKey, ready])

  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current) }, [])

  return (
    <div className="slide-preview-wrap">
      <div className="slide-preview" style={{ aspectRatio: '1080 / 1350' }}>
        {!ready ? (
          <div className="slide-preview-overlay">Waiting for photo…</div>
        ) : (
          <>
            {src && <img src={src} alt="slide preview" />}
            {loading && <div className="slide-preview-overlay">Rendering…</div>}
            {error && !loading && <div className="slide-preview-overlay error">{error}</div>}
            {!src && !loading && !error && <div className="slide-preview-overlay">Preview</div>}
          </>
        )}
      </div>
      {overflow.length > 0 && !loading && (
        <div className="overflow-warning">
          <strong>⚠ Content overflow:</strong>
          <ul>
            {overflow.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}
