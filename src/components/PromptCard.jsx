import React, { useRef, useState } from 'react'
import { api } from '../api.js'
import { useConfig } from '../ConfigContext.jsx'

// Shows an image prompt that's still needed, with three ways to fill it in:
// copy the prompt to paste into Gemini/ChatGPT yourself, generate it directly
// via the Gemini API (only offered when a key is configured), or drag/drop a
// file you already generated. Calls onFilled() once the key exists on disk.
export default function PromptCard({ item, onFilled }) {
  const { geminiConfigured } = useConfig()
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  const copy = () => {
    navigator.clipboard.writeText(item.prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  const generate = async () => {
    setBusy(true); setError(null)
    try {
      await api.generateImage(item.key, item.prompt)
      onFilled?.(item.key)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const upload = async (file) => {
    if (!file) return
    setBusy(true); setError(null)
    try {
      await api.uploadImage(item.key, file)
      onFilled?.(item.key)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="prompt-card">
      <div className="prompt-card-head">
        <span className="prompt-key">{item.key}</span>
        <button className="ghost" onClick={copy} disabled={busy}>{copied ? 'Copied' : 'Copy prompt'}</button>
      </div>
      <p className="prompt-text">{item.prompt}</p>
      <div
        className={'drop-zone' + (dragOver ? ' over' : '')}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault(); setDragOver(false)
          upload(e.dataTransfer.files?.[0])
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden
               onChange={(e) => upload(e.target.files?.[0])} />
        {busy ? 'Working…' : 'Drop the generated image here, or click to choose a file'}
      </div>
      {geminiConfigured && (
        <button className="primary" onClick={generate} disabled={busy}>Generate via API</button>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  )
}
