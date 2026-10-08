import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export function Register() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })

    if (error) {
      setError(error.message)
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <div>
        <h1>Registrering skickad</h1>
        <p>Kolla din e-post för att bekräfta kontot. Därefter väntar du på godkännande från en administratör.</p>
        <Link to="/login">Till inloggning</Link>
      </div>
    )
  }

  return (
    <div>
      <h1>Registrera konto</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="fullName">Namn</label>
          <input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="email">E-post</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="password">Lösenord</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </div>
        {error && <p role="alert">{error}</p>}
        <button type="submit">Registrera</button>
      </form>
      <p>
        Har du redan ett konto? <Link to="/login">Logga in</Link>
      </p>
    </div>
  )
}
