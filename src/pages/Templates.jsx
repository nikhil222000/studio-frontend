import React, { useEffect, useState } from 'react'
import { api } from '../api.js'
import { queueRender } from '../components/SlidePreview.jsx'

// One representative sample per slide layout, using photos already in the
// inbox so this always renders without needing new image generation — a
// design-QA gallery, not real content.
const SAMPLES = [
  { name: 'cover', slide: { layout: 'cover', photo: 'street', prompt: 'x', kicker: 'sample · cover', lines: ['This is the', 'cover', 'layout.'], sub: 'Used to open a carousel. Big headline over a photo, kicker top-left.', tone: 'crimson' } },
  { name: 'state', slide: { layout: 'state', photo: 'chai', prompt: 'x', kicker: 'sample · state', lines: ['This is the', 'state', 'layout.', 'One line highlighted.'], sub: 'Up to five short punchy lines, one or more highlighted in red.', tone: 'ink', hi: [3] } },
  { name: 'stat', slide: { layout: 'stat', photo: 'dal', prompt: 'x', kicker: 'sample · stat', value: '42', unit: 'unit', label: 'This is the stat layout', note: 'One big number with a label above and a supporting note below.', tone: 'ink', foot_note: 'Sample footnote.' } },
  { name: 'list', slide: { layout: 'list', photo: 'paneer', prompt: 'x', kicker: 'sample · list', title: 'This is the list layout', items: [['Row one', 'Value'], ['Row two', 'Value'], 'Plain bullet row'], tone: 'ink', note_txt: 'Optional note under the rows.' } },
  { name: 'cta', slide: { layout: 'cta', photo: 'spread', prompt: 'x', lines: ['This is the', 'cta layout.'], sub: 'Closing slide. Logo mark top-left, LINK IN BIO button bottom.', tone: 'crimson' } },
  { name: 'device', slide: { layout: 'device', shot: 'app-coach', kicker: 'sample · device', lines: ['This is the', 'device', 'layout.'], sub: 'Phone screenshot mockup on a gradient background with rings.', style: 'night' } },
  { name: 'quote', slide: { layout: 'quote', photo: 'chai', prompt: 'x', quote: 'This is the quote layout — a large pull-quote over a photo.', attribution: 'Sample attribution', tone: 'ink' } },
  { name: 'beforeAfter', slide: { layout: 'beforeAfter', photoBefore: 'dal', promptBefore: 'x', photoAfter: 'roti', promptAfter: 'x', labelBefore: 'BEFORE', labelAfter: 'AFTER', kicker: 'sample · beforeAfter', sub: 'Split-screen comparison with a VS badge at the divider.', tone: 'ink' } },
  { name: 'checklist', slide: { layout: 'checklist', photo: 'roti', prompt: 'x', kicker: 'sample · checklist', title: 'This is the checklist layout', items: ['First item', 'Second item', 'Third item', 'Fourth item'], tone: 'ink', note_txt: 'Optional closing note.' } },
  { name: 'timeline', slide: { layout: 'timeline', photo: 'soya', prompt: 'x', kicker: 'sample · timeline', title: 'This is the timeline layout', steps: [{ label: 'Step one', sub: 'A short description of this phase.' }, { label: 'Step two', sub: 'A short description of this phase.' }, { label: 'Step three', sub: 'A short description of this phase.' }], tone: 'ink' } },
  { name: 'ranking', slide: { layout: 'ranking', photo: 'paneer', prompt: 'x', kicker: 'sample · ranking', title: 'This is the ranking layout', items: [{ label: 'First place', value: 'Value' }, { label: 'Second place', value: 'Value' }, { label: 'Third place', value: 'Value' }], tone: 'crimson' } },
  { name: 'poll', slide: { layout: 'poll', photo: 'spread', prompt: 'x', kicker: 'sample · poll', question: 'This is the poll layout?', sub: 'A question card for engagement posts, with an optional hint box.', hint: 'ANSWER IN THE COMMENTS', tone: 'crimson' } },
  { name: 'nutrition', slide: { layout: 'nutrition', photo: 'dal', prompt: 'x', kicker: 'sample · nutrition', title: 'This is the nutrition layout', rows: [{ label: 'Row one', kcal: '180', protein: '9g', carbs: '24g', fat: '5g' }, { label: 'Row two', kcal: '160', protein: '6g', carbs: '30g', fat: '3g' }], tone: 'ink', note_txt: 'A real multi-column macro table, not just calories.' } },
]

function TemplateCard({ name, slide }) {
  const [src, setSrc] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let url
    let cancelled = false
    const attempt = () => queueRender(() => api.renderPreview(slide))
    ;(async () => {
      try {
        let res
        try {
          res = await attempt()
        } catch (e) {
          // Same one-retry as SlidePreview: a request dropped by a saturated
          // connection pool clears on a short second try.
          await new Promise((r) => setTimeout(r, 700))
          res = await attempt()
        }
        if (cancelled) return
        url = res.url
        setSrc(res.url)
      } catch (e) {
        if (!cancelled) setError(e.message)
      }
    })()
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="template-card">
      <div className="template-preview">
        {src && <img src={src} alt={name} />}
        {error && <div className="slide-preview-overlay error">{error}</div>}
        {!src && !error && <div className="slide-preview-overlay">Rendering…</div>}
      </div>
      <div className="template-name">{name}</div>
    </div>
  )
}

export default function Templates() {
  return (
    <div className="page page-wide">
      <h1>Templates</h1>
      <p className="meta" style={{ marginBottom: 20 }}>
        One sample of every slide layout, for design review — not real content. Uses photos already in your inbox so it always renders.
      </p>
      <div className="template-grid">
        {SAMPLES.map((s) => <TemplateCard key={s.name} {...s} />)}
      </div>
    </div>
  )
}
