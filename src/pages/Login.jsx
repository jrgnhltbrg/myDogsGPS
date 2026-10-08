import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import './Login.css'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      return
    }
    navigate('/dashboard')
  }

  return (
    <main className="login-page">
      <section className="login-brand" aria-label="myDogGPS medlemsportal">
        <div className="brand-topline">
          <span className="brand-dot" />
          <span>MYDOGGPS / MEDLEMSPORTAL</span>
        </div>
        <img className="brand-logo" src="/stimmos_logo.png" alt="Stimmos" />
        <p className="brand-caption">En plats för allt som hör till medlemskapet.</p>
        <span className="brand-index" aria-hidden="true">01 — MYDOGGPS</span>
      </section>

      <section className="login-panel">
        <div className="login-content">
          <p className="login-eyebrow">MEDLEMSKONTO</p>
          <h1>Välkommen tillbaka.</h1>
          <p className="login-intro">Logga in för att fortsätta till ditt medlemskap.</p>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="email">E-postadress</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="namn@exempel.se"
                required
              />
            </div>
            <div className="login-field">
              <label htmlFor="password">Lösenord</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ange ditt lösenord"
                required
              />
            </div>
            {error && <p className="login-error" role="alert">{error}</p>}
            <button className="login-submit" type="submit">
              <span>Logga in</span>
              <span aria-hidden="true">→</span>
            </button>
          </form>

          <p className="login-register">
            Ny på myDogGPS? <Link to="/register">Skapa ett konto</Link>
          </p>
        </div>
        <footer className="login-footer">myDogGPS <span>·</span> MEDLEMSPORTAL</footer>
      </section>
    </main>
  )
}
