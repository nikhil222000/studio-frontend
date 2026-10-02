// A handful of concurrent heavy requests (Playwright-rendered previews, large
// static images) can exceed the dev proxy's connection handling and strand a
// request that the server actually completed — it just never delivers the
// response, so a plain fetch() would hang forever with no error. A timeout
// turns that into a clear failure instead of an infinite spinner. Not
// retried automatically here: for POST/PUT (which can create or mutate
// something), a blind retry risks doing the mutation twice if the original
// request actually did land — better to surface the timeout and let the
// caller decide.
const REQUEST_TIMEOUT_MS = 15000

// Empty by default — every call below is a plain relative path, which works
// as-is for local dev (Vite's proxy) and for the combined single-process
// deployment (backend serves the built frontend from its own origin). Set
// VITE_API_BASE at build time (see frontend/.env.example) to point a
// separately-hosted static frontend at a backend on a different origin —
// e.g. https://studioapi.example.com — for a split frontend/backend deploy.
export const API_BASE = import.meta.env.VITE_API_BASE || ''

async function req(method, url, body) {
  const opts = { method, headers: {} }
  if (body instanceof FormData) {
    opts.body = body
  } else if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(body)
  }
  const controller = new AbortController()
  opts.signal = controller.signal
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  let res
  try {
    res = await fetch(API_BASE + url, opts)
  } catch (e) {
    if (e.name === 'AbortError') {
      throw new Error(`${method} ${url} timed out — it may have completed on the server; check before retrying`)
    }
    throw e
  } finally {
    clearTimeout(timer)
  }
  if (res.status === 204) return null
  const isJson = (res.headers.get('content-type') || '').includes('application/json')
  const data = isJson ? await res.json() : await res.text()
  if (!res.ok) throw new Error((data && data.error) || `${method} ${url} failed (${res.status})`)
  return data
}

const get = (url) => req('GET', url)
const post = (url, body) => req('POST', url, body)
const put = (url, body) => req('PUT', url, body)
const patch = (url, body) => req('PATCH', url, body)
const del = (url) => req('DELETE', url)

export const PLATFORMS = ['instagram', 'facebook', 'linkedin', 'x']
export const PLATFORM_LABELS = { instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn', x: 'X' }

export const api = {
  config: () => get('/api/config'),

  ideas: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v))
    return get(`/api/ideas?${qs}`)
  },
  idea: (id) => get(`/api/ideas/${encodeURIComponent(id)}`),

  festivals: (days = 120) => get(`/api/festivals?days=${days}`),

  posts: () => get('/api/posts'),
  post: (id) => get(`/api/posts/${encodeURIComponent(id)}`),
  postPrompts: (id) => get(`/api/posts/${encodeURIComponent(id)}/prompts`),
  createFromIdea: (ideaId, kind) => post('/api/posts/from-idea', { ideaId, kind }),
  createCustomFromIdea: (ideaId, layout) => post('/api/posts/from-idea/custom', { ideaId, layout }),
  layouts: () => get('/api/posts/_meta/layouts'),
  createPost: (id, post_) => post('/api/posts', { id, post: post_ }),
  updatePost: (id, post_) => put(`/api/posts/${encodeURIComponent(id)}`, post_),
  deletePost: (id) => del(`/api/posts/${encodeURIComponent(id)}`),
  generateCaptions: (id) => post(`/api/posts/${encodeURIComponent(id)}/captions`),
  setPosted: (id, posted) => patch(`/api/posts/${encodeURIComponent(id)}/posted`, { posted }),
  duplicatePost: (id) => post(`/api/posts/${encodeURIComponent(id)}/duplicate`, {}),
  makeStoryFromPost: (id) => post(`/api/posts/${encodeURIComponent(id)}/make-story`, {}),

  calendar: () => get('/api/calendar'),
  setCalendarSlot: (date, postId) => put(`/api/calendar/${date}`, { postId }),
  today: () => get('/api/today'),
  week: (from) => get(`/api/week${from ? `?from=${from}` : ''}`),
  plan: (opts) => post('/api/plan', opts),

  imageStatus: (key) => get(`/api/images/${encodeURIComponent(key)}/status`),
  uploadImage: (key, file) => {
    const fd = new FormData()
    fd.append('file', file)
    return post(`/api/images/${encodeURIComponent(key)}/upload`, fd)
  },
  generateImage: (key, prompt) => post(`/api/images/${encodeURIComponent(key)}/generate`, { prompt }),
  deleteImage: (key) => del(`/api/images/${encodeURIComponent(key)}`),

  assets: () => get('/api/assets'),

  buildPost: (id, fresh = false, backend) => post(`/api/build/post/${encodeURIComponent(id)}`, { fresh, backend }),
  buildStory: (key, fresh = false, backend) => post(`/api/build/story/${encodeURIComponent(key)}`, { fresh, backend }),
  buildHighlights: () => post('/api/build/highlights', {}),

  manifest: () => get('/api/manifest'),
  campaign: () => get('/api/campaign'),

  // Returns { url, overflow } — url is an object URL for the rendered PNG
  // (caller should URL.revokeObjectURL() the previous one before requesting
  // a new preview); overflow is a string[] of clipped/off-canvas warnings.
  renderPreview: async (slide, n, total) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    let res
    try {
      res = await fetch(API_BASE + '/api/render/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slide, n, total }),
        signal: controller.signal,
      })
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('preview render timed out')
      throw e
    } finally {
      clearTimeout(timer)
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `preview failed (${res.status})`)
    }
    let overflow = []
    const header = res.headers.get('X-Overflow-Warnings')
    if (header) {
      try { overflow = JSON.parse(decodeURIComponent(header)) } catch { /* ignore */ }
    }
    const blob = await res.blob()
    return { url: URL.createObjectURL(blob), overflow }
  },
}
