import React, { useState } from 'react'
import { api } from '../api.js'
import { setToken } from '../auth.js'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const { token } = await api.login(email, otp)
      setToken(token)
      onLogin()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form className="card-block" onSubmit={submit} style={{ width: 340 }}>
        <div className="brand" style={{ marginBottom: 18 }}><span className="mark" />FitKarta Studio</div>
        <div className="field-row">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required />
        </div>
        <div className="field-row">
          <label>OTP</label>
          <input type="password" inputMode="numeric" value={otp} onChange={(e) => setOtp(e.target.value)} required />
        </div>
        {error && <p className="error">{error}</p>}
        <button className="primary" type="submit" disabled={busy} style={{ width: '100%' }}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
