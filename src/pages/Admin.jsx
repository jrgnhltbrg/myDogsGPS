import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import './Admin.css'

export function Admin() {
  const { signOut } = useAuth()
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)

  async function loadProfiles() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    setProfiles(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadProfiles()
  }, [])

  async function setStatus(id, status) {
    await supabase.from('profiles').update({ status }).eq('id', id)
    loadProfiles()
  }

  const pending = profiles.filter((p) => p.status === 'pending')
  const others = profiles.filter((p) => p.status !== 'pending')

  return (
    <div className="members-page">
      <header className="members-header">
        <Link className="members-brand" to="/dashboard">
          <img src="/stimmos_logo.png" alt="" />
          <span>myDogGPS</span>
        </Link>
        <nav aria-label="Huvudmeny">
          <Link to="/dashboard">Översikt</Link>
          <button type="button" onClick={signOut}>Logga ut</button>
        </nav>
      </header>

      <main className="members-main">
        <div className="members-heading">
          <div>
            <p className="members-eyebrow">ADMINISTRATION</p>
            <h1>Personregister</h1>
            <p>Medlemskonton och åtkomstförfrågningar.</p>
          </div>
          <span className="members-total">{profiles.length} konton</span>
        </div>

        <section className="members-section" aria-labelledby="pending-title">
          <div className="members-section-heading">
            <h2 id="pending-title">Väntar på godkännande</h2>
            <span>{pending.length}</span>
          </div>
          {loading && <p className="members-state">Laddar medlemmar...</p>}
          {!loading && pending.length === 0 && <p className="members-state">Inga väntande konton.</p>}
          {!loading && pending.length > 0 && (
            <div className="members-table-wrap">
              <table className="members-table">
                <thead>
                  <tr><th>Namn</th><th>E-post</th><th>Registrerad</th><th>Åtgärd</th></tr>
                </thead>
                <tbody>
                  {pending.map((p) => (
                    <tr key={p.id}>
                      <td data-label="Namn">{p.full_name || '—'}</td>
                      <td data-label="E-post">{p.email}</td>
                      <td data-label="Registrerad">{new Date(p.created_at).toLocaleDateString('sv-SE')}</td>
                      <td data-label="Åtgärd" className="member-actions">
                        <button className="member-approve" type="button" onClick={() => setStatus(p.id, 'approved')}>Godkänn</button>
                        <button className="member-reject" type="button" onClick={() => setStatus(p.id, 'rejected')}>Neka</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="members-section" aria-labelledby="accounts-title">
          <div className="members-section-heading">
            <h2 id="accounts-title">Alla övriga konton</h2>
            <span>{others.length}</span>
          </div>
          {!loading && others.length === 0 && <p className="members-state">Inga fler konton ännu.</p>}
          {!loading && others.length > 0 && (
            <div className="members-table-wrap">
              <table className="members-table">
                <thead>
                  <tr><th>Namn</th><th>E-post</th><th>Status</th><th>Roll</th></tr>
                </thead>
                <tbody>
                  {others.map((p) => (
                    <tr key={p.id}>
                      <td data-label="Namn">{p.full_name || '—'}</td>
                      <td data-label="E-post">{p.email}</td>
                      <td data-label="Status"><span className={`member-status member-status-${p.status}`}>{p.status}</span></td>
                      <td data-label="Roll">{p.role === 'admin' ? 'Administratör' : 'Medlem'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
