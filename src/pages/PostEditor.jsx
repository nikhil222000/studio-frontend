import React, { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api.js'
import PromptCard from '../components/PromptCard.jsx'
import SlidePreview from '../components/SlidePreview.jsx'

const TONES = ['ink', 'crimson']
const STYLES = ['night', 'crimson']

// Mirrors the server's photoRefs() in lib/build.ts — which photo key(s) a
// slide actually needs. `device` slides use a real screenshot, not an
// AI-generated photo, so they're always ready to render.
function slidePhotoKeys(slide) {
  if (slide.layout === 'beforeAfter') return [slide.photoBefore, slide.photoAfter]
  if (slide.layout === 'device') return []
  return slide.photo ? [slide.photo] : []
}

function linesToText(lines) { return (lines || []).join('\n') }
function textToLines(text) { return text.split('\n').map((l) => l.trim()).filter(Boolean) }

function itemsToText(items) {
  return (items || []).map((it) => Array.isArray(it) ? `${it[0]} | ${it[1]}` : it).join('\n')
}
function textToItems(text) {
  return text.split('\n').map((l) => l.trim()).filter(Boolean).map((line) => {
    const parts = line.split('|').map((s) => s.trim())
    return parts.length === 2 ? [parts[0], parts[1]] : line
  })
}

function pairsToText(items, keyA, keyB) {
  return (items || []).map((it) => `${it[keyA]} | ${it[keyB]}`).join('\n')
}
function textToPairs(text, keyA, keyB) {
  return text.split('\n').map((l) => l.trim()).filter(Boolean).map((line) => {
    const [a, b] = line.split('|').map((s) => (s || '').trim())
    return { [keyA]: a || '', [keyB]: b || '' }
  })
}

function rowsToText(rows) {
  return (rows || []).map((r) => `${r.label} | ${r.kcal} | ${r.protein} | ${r.carbs} | ${r.fat}`).join('\n')
}
function textToRows(text) {
  return text.split('\n').map((l) => l.trim()).filter(Boolean).map((line) => {
    const [label, kcal, protein, carbs, fat] = line.split('|').map((s) => (s || '').trim())
    return { label: label || '', kcal: kcal || '', protein: protein || '', carbs: carbs || '', fat: fat || '' }
  })
}

// Every slide accepts an optional style block (offsetY/spacing/titleSize/
// maxWidth/showKicker/showFootnote) — real pixel-level control without a
// drag-and-drop canvas. `device` stores it as `layoutStyle` since `style`
// already means night/crimson there.
function StyleFields({ slide, onChange }) {
  const styleKey = slide.layout === 'device' ? 'layoutStyle' : 'style'
  const style = slide[styleKey] || {}
  const set = (patch) => onChange({ ...slide, [styleKey]: { ...style, ...patch } })
  const num = (key) => ({
    value: style[key] ?? '',
    onChange: (e) => set({ [key]: e.target.value === '' ? undefined : Number(e.target.value) }),
  })

  return (
    <details className="style-fields">
      <summary>Layout &amp; spacing (px)</summary>
      <div className="style-grid">
        <label>Shift up/down<input type="number" placeholder="0" {...num('offsetY')} /></label>
        <label>Row/line spacing<input type="number" placeholder="0" {...num('spacing')} /></label>
        <label>Title size<input type="number" placeholder="default" {...num('titleSize')} /></label>
        <label>Content width<input type="number" placeholder="default" {...num('maxWidth')} /></label>
      </div>
      <div className="style-toggles">
        <label className="checkbox">
          <input type="checkbox" checked={style.showKicker !== false} onChange={(e) => set({ showKicker: e.target.checked })} />
          Show kicker
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={style.showFootnote !== false} onChange={(e) => set({ showFootnote: e.target.checked })} />
          Show note / footnote
        </label>
      </div>
    </details>
  )
}

function PhotoField({ label, photo, prompt, onPhoto, onPrompt }) {
  return (
    <div className="field-row">
      <label>{label} — photo key</label>
      <input value={photo} onChange={(e) => onPhoto(e.target.value)} />
      <label>{label} — prompt subject</label>
      <textarea rows={2} value={prompt} onChange={(e) => onPrompt(e.target.value)} />
    </div>
  )
}

function SlideFields({ slide, onChange }) {
  const set = (patch) => onChange({ ...slide, ...patch })

  const photoField = 'photo' in slide && (
    <PhotoField label="Photo" photo={slide.photo} prompt={slide.prompt}
      onPhoto={(v) => set({ photo: v })} onPrompt={(v) => set({ prompt: v })} />
  )
  const toneField = 'tone' in slide && (
    <div className="field-row">
      <label>Tone</label>
      <select value={slide.tone} onChange={(e) => set({ tone: e.target.value })}>
        {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
    </div>
  )

  switch (slide.layout) {
    case 'cover':
      return <>
        {photoField}
        <div className="field-row"><label>Kicker</label><input value={slide.kicker} onChange={(e) => set({ kicker: e.target.value })} /></div>
        <div className="field-row"><label>Headline (one line each)</label><textarea rows={3} value={linesToText(slide.lines)} onChange={(e) => set({ lines: textToLines(e.target.value) })} /></div>
        <div className="field-row"><label>Sub</label><textarea rows={2} value={slide.sub} onChange={(e) => set({ sub: e.target.value })} /></div>
        {toneField}
      </>
    case 'state':
      return <>
        {photoField}
        <div className="field-row"><label>Kicker</label><input value={slide.kicker} onChange={(e) => set({ kicker: e.target.value })} /></div>
        <div className="field-row"><label>Headline (one line each)</label><textarea rows={3} value={linesToText(slide.lines)} onChange={(e) => set({ lines: textToLines(e.target.value) })} /></div>
        <div className="field-row"><label>Sub</label><textarea rows={2} value={slide.sub} onChange={(e) => set({ sub: e.target.value })} /></div>
        <div className="field-row"><label>Highlighted line #s (comma-separated, 0-based)</label>
          <input value={(slide.hi || []).join(',')} onChange={(e) => set({ hi: e.target.value.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n)) })} />
        </div>
        {toneField}
      </>
    case 'stat':
      return <>
        {photoField}
        <div className="field-row"><label>Kicker</label><input value={slide.kicker} onChange={(e) => set({ kicker: e.target.value })} /></div>
        <div className="field-row"><label>Value</label><input value={slide.value} onChange={(e) => set({ value: e.target.value })} />
          <label>Unit</label><input value={slide.unit} onChange={(e) => set({ unit: e.target.value })} /></div>
        <div className="field-row"><label>Label</label><input value={slide.label} onChange={(e) => set({ label: e.target.value })} /></div>
        <div className="field-row"><label>Note</label><textarea rows={2} value={slide.note} onChange={(e) => set({ note: e.target.value })} /></div>
        <div className="field-row"><label>Foot note</label><input value={slide.foot_note || ''} onChange={(e) => set({ foot_note: e.target.value || undefined })} /></div>
        {toneField}
      </>
    case 'list':
      return <>
        {photoField}
        <div className="field-row"><label>Kicker</label><input value={slide.kicker} onChange={(e) => set({ kicker: e.target.value })} /></div>
        <div className="field-row"><label>Title</label><input value={slide.title} onChange={(e) => set({ title: e.target.value })} /></div>
        <div className="field-row"><label>Items (one per line: bullet text, or "label | value")</label>
          <textarea rows={5} value={itemsToText(slide.items)} onChange={(e) => set({ items: textToItems(e.target.value) })} /></div>
        <div className="field-row"><label>Note</label><input value={slide.note_txt || ''} onChange={(e) => set({ note_txt: e.target.value || undefined })} /></div>
        {toneField}
      </>
    case 'cta':
      return <>
        {photoField}
        <div className="field-row"><label>Headline (one line each)</label><textarea rows={2} value={linesToText(slide.lines)} onChange={(e) => set({ lines: textToLines(e.target.value) })} /></div>
        <div className="field-row"><label>Sub</label><textarea rows={2} value={slide.sub} onChange={(e) => set({ sub: e.target.value })} /></div>
        <div className="field-row"><label>Legal (optional disclaimer)</label><textarea rows={2} value={slide.legal || ''} onChange={(e) => set({ legal: e.target.value || undefined })} /></div>
        {toneField}
      </>
    case 'device':
      return <>
        <div className="field-row"><label>Screenshot name</label><input value={slide.shot} onChange={(e) => set({ shot: e.target.value })} /></div>
        <div className="field-row"><label>Kicker</label><input value={slide.kicker} onChange={(e) => set({ kicker: e.target.value })} /></div>
        <div className="field-row"><label>Headline (one line each)</label><textarea rows={2} value={linesToText(slide.lines)} onChange={(e) => set({ lines: textToLines(e.target.value) })} /></div>
        <div className="field-row"><label>Sub</label><textarea rows={2} value={slide.sub} onChange={(e) => set({ sub: e.target.value })} /></div>
        <div className="field-row"><label>Style</label>
          <select value={slide.style} onChange={(e) => set({ style: e.target.value })}>
            {STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </>
    case 'quote':
      return <>
        {photoField}
        <div className="field-row"><label>Quote</label><textarea rows={3} value={slide.quote} onChange={(e) => set({ quote: e.target.value })} /></div>
        <div className="field-row"><label>Attribution (optional)</label><input value={slide.attribution || ''} onChange={(e) => set({ attribution: e.target.value || undefined })} /></div>
        {toneField}
      </>
    case 'beforeAfter':
      return <>
        <PhotoField label="Before" photo={slide.photoBefore} prompt={slide.promptBefore}
          onPhoto={(v) => set({ photoBefore: v })} onPrompt={(v) => set({ promptBefore: v })} />
        <div className="field-row"><label>Before label</label><input value={slide.labelBefore} onChange={(e) => set({ labelBefore: e.target.value })} /></div>
        <PhotoField label="After" photo={slide.photoAfter} prompt={slide.promptAfter}
          onPhoto={(v) => set({ photoAfter: v })} onPrompt={(v) => set({ promptAfter: v })} />
        <div className="field-row"><label>After label</label><input value={slide.labelAfter} onChange={(e) => set({ labelAfter: e.target.value })} /></div>
        <div className="field-row"><label>Kicker</label><input value={slide.kicker} onChange={(e) => set({ kicker: e.target.value })} /></div>
        <div className="field-row"><label>Sub / caption bar</label><textarea rows={2} value={slide.sub} onChange={(e) => set({ sub: e.target.value })} /></div>
        {toneField}
      </>
    case 'checklist':
      return <>
        {photoField}
        <div className="field-row"><label>Kicker</label><input value={slide.kicker} onChange={(e) => set({ kicker: e.target.value })} /></div>
        <div className="field-row"><label>Title</label><input value={slide.title} onChange={(e) => set({ title: e.target.value })} /></div>
        <div className="field-row"><label>Items (one per line)</label>
          <textarea rows={5} value={(slide.items || []).join('\n')} onChange={(e) => set({ items: textToLines(e.target.value) })} /></div>
        <div className="field-row"><label>Note (optional)</label><input value={slide.note_txt || ''} onChange={(e) => set({ note_txt: e.target.value || undefined })} /></div>
        {toneField}
      </>
    case 'timeline':
      return <>
        {photoField}
        <div className="field-row"><label>Kicker</label><input value={slide.kicker} onChange={(e) => set({ kicker: e.target.value })} /></div>
        <div className="field-row"><label>Title</label><input value={slide.title} onChange={(e) => set({ title: e.target.value })} /></div>
        <div className="field-row"><label>Steps (one per line: "label | detail")</label>
          <textarea rows={5} value={pairsToText(slide.steps, 'label', 'sub')} onChange={(e) => set({ steps: textToPairs(e.target.value, 'label', 'sub') })} /></div>
        {toneField}
      </>
    case 'ranking':
      return <>
        {photoField}
        <div className="field-row"><label>Kicker</label><input value={slide.kicker} onChange={(e) => set({ kicker: e.target.value })} /></div>
        <div className="field-row"><label>Title</label><input value={slide.title} onChange={(e) => set({ title: e.target.value })} /></div>
        <div className="field-row"><label>Items, in rank order (one per line: "label | value")</label>
          <textarea rows={5} value={pairsToText(slide.items, 'label', 'value')} onChange={(e) => set({ items: textToPairs(e.target.value, 'label', 'value') })} /></div>
        {toneField}
      </>
    case 'poll':
      return <>
        {photoField}
        <div className="field-row"><label>Kicker</label><input value={slide.kicker} onChange={(e) => set({ kicker: e.target.value })} /></div>
        <div className="field-row"><label>Question</label><textarea rows={2} value={slide.question} onChange={(e) => set({ question: e.target.value })} /></div>
        <div className="field-row"><label>Sub</label><textarea rows={2} value={slide.sub} onChange={(e) => set({ sub: e.target.value })} /></div>
        <div className="field-row"><label>Hint box (optional, e.g. "ANSWER IN THE COMMENTS")</label><input value={slide.hint || ''} onChange={(e) => set({ hint: e.target.value || undefined })} /></div>
        {toneField}
      </>
    case 'nutrition':
      return <>
        {photoField}
        <div className="field-row"><label>Kicker</label><input value={slide.kicker} onChange={(e) => set({ kicker: e.target.value })} /></div>
        <div className="field-row"><label>Title</label><input value={slide.title} onChange={(e) => set({ title: e.target.value })} /></div>
        <div className="field-row"><label>Rows (one per line: "food | kcal | protein | carbs | fat")</label>
          <textarea rows={6} value={rowsToText(slide.rows)} onChange={(e) => set({ rows: textToRows(e.target.value) })} /></div>
        <div className="field-row"><label>Note</label><input value={slide.note_txt || ''} onChange={(e) => set({ note_txt: e.target.value || undefined })} /></div>
        {toneField}
      </>
    default:
      return null
  }
}

export default function PostEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [post, setPost] = useState(null)
  const [prompts, setPrompts] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [savedAt, setSavedAt] = useState(null)
  const [fresh, setFresh] = useState(false)
  const [building, setBuilding] = useState(false)
  const [buildResult, setBuildResult] = useState(null)
  // Per-photo-key version counters — bumping only the key that was just
  // uploaded (instead of one shared counter for the whole post) means only
  // the slide(s) actually using that photo re-render, not every slide in
  // the post. A carousel re-rendering all of its slides on every single
  // upload was firing that many concurrent Playwright-backed requests at
  // once, which is exactly what was starving the next upload's own request
  // of a free connection and timing it out.
  const [photoVersion, setPhotoVersion] = useState({})
  const [duplicating, setDuplicating] = useState(false)
  const [makingStory, setMakingStory] = useState(false)
  const [actionMsg, setActionMsg] = useState(null)

  const load = useCallback(async () => {
    const p = await api.post(id)
    setPost(p)
    const pr = await api.postPrompts(id)
    setPrompts(pr.prompts)
  }, [id])

  // The route is /posts/:id — navigating from one post to another keeps this
  // same component mounted (React Router doesn't remount for a param-only
  // change), so a failed load's error has to be cleared explicitly here.
  // Without this, a single transient failure on post A would leave every
  // post opened afterward stuck showing A's old error, even though its own
  // load actually succeeded — the exact "have to refresh" symptom.
  useEffect(() => {
    setError(null); setPost(null)
    load().catch((e) => setError(e.message))
  }, [load])

  const updateSlide = (idx, next) => {
    setPost((p) => ({ ...p, slides: p.slides.map((s, i) => i === idx ? next : s) }))
  }

  // Slide numbers (n/total shown in the editor and baked into the "N / total"
  // footer counter on the rendered card) are derived from array position, not
  // stored on the slide itself — removing one here is all that's needed for
  // every slide after it to renumber correctly on the next render.
  const deleteSlide = (idx) => {
    if (post.slides.length <= 1) return // a post needs at least one slide
    if (!confirm(`Delete slide ${idx + 1}? This cannot be undone.`)) return
    setPost((p) => ({ ...p, slides: p.slides.filter((_, i) => i !== idx) }))
  }

  const save = async () => {
    setSaving(true); setError(null)
    try {
      await api.updatePost(id, post)
      setSavedAt(new Date().toLocaleTimeString())
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!confirm(`Delete post '${id}'? This cannot be undone.`)) return
    await api.deletePost(id)
    navigate('/ideas')
  }

  // Build always saves first, so what gets rendered is exactly what's on screen —
  // no separate "did I save before building" step to remember.
  const build = async () => {
    setBuilding(true); setError(null); setBuildResult(null)
    try {
      await api.updatePost(id, post)
      setSavedAt(new Date().toLocaleTimeString())
      const result = await api.buildPost(id, fresh)
      setBuildResult(result)
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBuilding(false)
    }
  }

  // After an image is uploaded/generated, refresh the prompt list and bump
  // only that key's version — so only the slide(s) that actually use this
  // photo re-render, not every slide in the post. Building is a separate,
  // explicit action — the Build button — never an automatic side effect of
  // the last image landing.
  const onImageFilled = async (key) => {
    const pr = await api.postPrompts(id)
    setPrompts(pr.prompts)
    if (key) setPhotoVersion((v) => ({ ...v, [key]: (v[key] || 0) + 1 }))
  }

  const duplicate = async () => {
    setDuplicating(true); setError(null); setActionMsg(null)
    try {
      const { id: newId } = await api.duplicatePost(id)
      navigate(`/posts/${encodeURIComponent(newId)}`)
    } catch (e) {
      setError(e.message)
    } finally {
      setDuplicating(false)
    }
  }

  const makeStory = async () => {
    setMakingStory(true); setError(null); setActionMsg(null)
    try {
      const { id: storyId, built } = await api.makeStoryFromPost(id)
      setActionMsg(built
        ? `Story '${storyId}' created and built — check the Stories tab in Preview.`
        : `Story '${storyId}' created, but its photo isn't ready yet — build it from the Stories bank once the image is available.`)
    } catch (e) {
      setError(e.message)
    } finally {
      setMakingStory(false)
    }
  }

  if (error) return (
    <div className="empty">
      <p className="error">{error}</p>
      <button className="ghost" onClick={() => { setError(null); load().catch((e) => setError(e.message)) }}>Retry</button>
    </div>
  )
  if (!post) return <div className="empty"><p>Loading…</p></div>

  const missing = prompts.filter((p) => !p.have)
  const total = post.slides.length

  return (
    <div className="page page-wide">
      <div className="row-between">
        <h1>{id}</h1>
        <div className="row" style={{ gap: 12 }}>
          {savedAt && <span className="meta">Saved {savedAt}</span>}
          <label className="checkbox">
            <input type="checkbox" checked={fresh} onChange={(e) => setFresh(e.target.checked)} />
            Fresh (new photos)
          </label>
          <button className="ghost" onClick={makeStory} disabled={makingStory}>{makingStory ? 'Creating…' : 'Also make a Story'}</button>
          <button className="ghost" onClick={duplicate} disabled={duplicating}>{duplicating ? 'Duplicating…' : 'Duplicate'}</button>
          <button className="ghost" onClick={remove}>Delete</button>
          <button className="ghost" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          <button className="primary" onClick={build} disabled={building}>{building ? 'Building…' : 'Build'}</button>
        </div>
      </div>

      {actionMsg && <p className="success">{actionMsg}</p>}

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

      <div className="card-block">
        <div className="field-row"><label>Title</label><input value={post.title} onChange={(e) => setPost({ ...post, title: e.target.value })} /></div>
        <div className="field-row"><label>Kind</label>
          <select value={post.kind} onChange={(e) => setPost({ ...post, kind: e.target.value })}>
            <option value="single">single</option>
            <option value="carousel">carousel</option>
          </select>
        </div>
        <div className="field-row"><label>Caption</label><textarea rows={3} value={post.caption} onChange={(e) => setPost({ ...post, caption: e.target.value })} /></div>
        <div className="field-row"><label>Tags</label><input value={post.tags} onChange={(e) => setPost({ ...post, tags: e.target.value })} /></div>
      </div>

      {missing.length > 0 && (
        <div className="section">
          <h3>Images needed ({missing.length})</h3>
          {missing.map((item) => <PromptCard key={item.key} item={item} onFilled={onImageFilled} />)}
        </div>
      )}

      <div className="section">
        <h3>Slides ({total})</h3>
        {post.slides.map((slide, idx) => {
          const keys = slidePhotoKeys(slide)
          const haveByKey = Object.fromEntries(prompts.map((p) => [p.key, p.have]))
          // A key not present in `prompts` at all was never a needed image for
          // this post (shouldn't happen for a key this slide actually uses,
          // but treat unknown as "ready" rather than blocking forever).
          const ready = keys.every((k) => haveByKey[k] !== false)
          const slideRefreshKey = keys.map((k) => photoVersion[k] || 0).join('-')
          return (
            <div className="card-block slide-editor-row" key={idx}>
              <div className="slide-editor-fields">
                <div className="row-between">
                  <div className="row" style={{ gap: 10 }}>
                    <strong>Slide {idx + 1}</strong>
                    <span className="tag">{slide.layout}</span>
                  </div>
                  <button className="ghost danger" onClick={() => deleteSlide(idx)} disabled={post.slides.length <= 1}>
                    Delete slide
                  </button>
                </div>
                <SlideFields slide={slide} onChange={(next) => updateSlide(idx, next)} />
                <StyleFields slide={slide} onChange={(next) => updateSlide(idx, next)} />
              </div>
              <SlidePreview slide={slide} n={total > 1 ? idx + 1 : undefined} total={total > 1 ? total : undefined}
                refreshKey={slideRefreshKey} ready={ready} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
