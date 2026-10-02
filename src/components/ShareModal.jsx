import React, { useEffect, useState } from 'react'
import { api, API_BASE, PLATFORMS, PLATFORM_LABELS } from '../api.js'

const M = (p) => API_BASE + '/media/' + p

// What's actually possible without OAuth app registrations or public image
// hosting (see README) — honest per platform rather than a fake "post" button.
const PLATFORM_INFO = {
  instagram: {
    action: null,
    note: 'Instagram has no web posting flow at all (even the official Graph API needs a Business account and a publicly hosted image URL). Download the image, then post it from the Instagram app.',
  },
  facebook: {
    action: { label: 'Open Facebook', url: 'https://www.facebook.com/' },
    note: "Facebook's share link needs a public URL to pull a preview from, which a local image doesn't have. Opens Facebook so you can start a post — paste the caption and attach the downloaded image yourself.",
  },
  linkedin: {
    action: { label: 'Open LinkedIn composer', url: 'https://www.linkedin.com/feed/?shareActive=true' },
    note: 'Opens LinkedIn’s "start a post" box directly. Paste the caption and attach the downloaded image yourself — same public-URL limitation as Facebook.',
  },
  x: {
    action: (text) => ({ label: 'Open X to compose', url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}` }),
    note: 'X’s compose window opens pre-filled with the caption below. Image attachment still has to be manual — X’s share intent doesn’t accept a local file.',
  },
}

// The Web Share API's file-sharing support is what actually gives you the
// "pick Instagram from the OS share sheet" flow — same mechanism your phone's
// gallery app uses. It only exists on browsers/OSes that implement it
// (mobile Chrome/Android, Safari/iOS; most desktop browsers don't), so this
// feature-detects and only shows the button when it has a real chance of
// working, with the existing copy/download flow always available underneath.
const nativeShareLikelySupported = typeof navigator !== 'undefined' && !!navigator.canShare

async function fetchAsFile(url, filename) {
  const res = await fetch(url)
  const blob = await res.blob()
  return new File([blob], filename, { type: blob.type || 'image/png' })
}

// A plain <a href download> only triggers a save-as dialog for same-origin
// URLs — browsers silently ignore `download` cross-origin (it just navigates
// to the image instead), which is exactly the case once API_BASE points at a
// separately-hosted backend. Fetching as a blob and downloading via a
// same-origin blob: URL works regardless of where the API actually lives.
async function downloadFile(url, filename) {
  const res = await fetch(url)
  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(objectUrl)
}

export default function ShareModal({ post, onClose }) {
  const [captions, setCaptions] = useState(post.platformCaptions || null)
  const [platform, setPlatform] = useState('instagram')
  const [loading, setLoading] = useState(!post.platformCaptions)
  const [copied, setCopied] = useState(false)
  const [edited, setEdited] = useState({})
  const [nativeShare, setNativeShare] = useState({ busy: false, error: null })

  useEffect(() => {
    if (!captions) {
      api.generateCaptions(post.id).then((r) => setCaptions(r.platformCaptions)).finally(() => setLoading(false))
    }
  }, [post.id])

  const text = edited[platform] ?? captions?.[platform] ?? ''
  const info = PLATFORM_INFO[platform]
  const action = typeof info.action === 'function' ? info.action(text) : info.action

  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true); setTimeout(() => setCopied(false), 1400)
  }

  const shareNatively = async () => {
    setNativeShare({ busy: true, error: null })
    try {
      const files = await Promise.all(post.slides.map((s, i) => fetchAsFile(M(s), `${post.id}-${i + 1}.png`)))
      const payload = { files, title: post.title, text }
      if (navigator.canShare && !navigator.canShare(payload)) {
        throw new Error("This browser's share sheet doesn't accept images here — use copy + download below instead.")
      }
      await navigator.share(payload)
      setNativeShare({ busy: false, error: null })
    } catch (e) {
      if (e.name === 'AbortError') { setNativeShare({ busy: false, error: null }); return } // user cancelled the sheet
      setNativeShare({ busy: false, error: e.message || 'Sharing failed — use copy + download below instead.' })
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="row-between">
          <h2>Share — {post.title}</h2>
          <button className="ghost" onClick={onClose}>Close</button>
        </div>

        {nativeShareLikelySupported && (
          <div className="native-share-block">
            <button className="primary" onClick={shareNatively} disabled={nativeShare.busy}>
              {nativeShare.busy ? 'Preparing images…' : `Share ${post.slides.length > 1 ? `${post.slides.length} images` : 'image'}…`}
            </button>
            <span className="meta">Opens your device's own share sheet — Instagram will show up there if it's installed.</span>
            {nativeShare.error && <p className="error">{nativeShare.error}</p>}
          </div>
        )}

        <div className="tabs share-tabs">
          {PLATFORMS.map((p) => (
            <button key={p} className={p === platform ? 'on' : ''} onClick={() => setPlatform(p)}>
              {PLATFORM_LABELS[p]}
            </button>
          ))}
        </div>

        {loading ? <p className="meta">Generating captions…</p> : (
          <>
            <textarea
              rows={6}
              value={text}
              onChange={(e) => setEdited({ ...edited, [platform]: e.target.value })}
            />
            {platform === 'x' && <p className="meta">{text.length} / 280 characters</p>}

            <div className="row" style={{ gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
              <button className="ghost" onClick={copy}>{copied ? 'Copied' : 'Copy caption'}</button>
              <button className="ghost" onClick={() => downloadFile(M(post.slides[0]), `${post.id}-1.png`)}>Download image</button>
              {post.slides.length > 1 && (
                <button className="ghost" onClick={() => downloadFile(M(post.slides[post.slides.length - 1]), `${post.id}-${post.slides.length}.png`)}>
                  Download last slide
                </button>
              )}
              {action && (
                <a className="primary" href={action.url} target="_blank" rel="noreferrer" onClick={copy}>
                  {action.label}
                </a>
              )}
            </div>

            <p className="meta share-note">{info.note}</p>
          </>
        )}
      </div>
    </div>
  )
}
