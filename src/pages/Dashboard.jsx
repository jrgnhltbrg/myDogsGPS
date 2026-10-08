import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import './Dashboard.css'

export function Dashboard() {
  const { profile, signOut } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [dogs, setDogs] = useState([])
  const [dogsLoading, setDogsLoading] = useState(true)
  const [dogName, setDogName] = useState('')
  const [dogBreed, setDogBreed] = useState('')
  const [dogBirthDate, setDogBirthDate] = useState('')
  const [dogError, setDogError] = useState(null)
  const [dogNotice, setDogNotice] = useState(null)
  const [savingDog, setSavingDog] = useState(false)

  useEffect(() => {
    if (!profile?.id) return

    let cancelled = false

    async function loadDogs() {
      setDogsLoading(true)
      const { data, error } = await supabase
        .from('dogs')
        .select('id, name, breed, birth_date, created_at')
        .order('created_at', { ascending: false })

      if (cancelled) return

      if (error) {
        setDogError('Hundregistret kunde inte hämtas. Kontrollera att SQL-migreringen add_dogs.sql är körd i Supabase.')
      } else {
        setDogs(data ?? [])
      }
      setDogsLoading(false)
    }

    loadDogs()
    return () => {
      cancelled = true
    }
  }, [profile?.id])

  async function handleDogSubmit(event) {
    event.preventDefault()
    setDogError(null)
    setDogNotice(null)
    setSavingDog(true)

    const { data, error } = await supabase
      .from('dogs')
      .insert({
        owner_id: profile.id,
        name: dogName.trim(),
        breed: dogBreed.trim() || null,
        birth_date: dogBirthDate || null,
      })
      .select('id, name, breed, birth_date, created_at')
      .single()

    if (error) {
      setDogError(`Hunden kunde inte sparas: ${error.message}`)
    } else {
      setDogs((currentDogs) => [data, ...currentDogs])
      setDogName('')
      setDogBreed('')
      setDogBirthDate('')
      setDogNotice(`${data.name} har lagts till.`)
    }

    setSavingDog(false)
  }

  function formatBirthDate(date) {
    if (!date) return null
    return new Intl.DateTimeFormat('sv-SE').format(new Date(`${date}T12:00:00`))
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <Link className="dashboard-brand" to="/dashboard" aria-label="myDogGPS startsida">
          <img src="/stimmos_logo.png" alt="" />
          <span>myDogGPS</span>
        </Link>
        <nav className="dashboard-nav" aria-label="Huvudmeny">
          {isAdmin && <Link to="/personregister">Personregister</Link>}
          <button type="button" onClick={signOut}>Logga ut</button>
        </nav>
      </header>

      <main className="dashboard-main">
        <section className="dashboard-welcome">
          <p className="dashboard-eyebrow">MEDLEMSPORTAL</p>
          <h1>Välkommen, {profile?.full_name || profile?.email}</h1>
          <p className="dashboard-subtitle">Hundar och medlemsuppgifter samlade på ett ställe.</p>
        </section>

        <section className="dogs-section" aria-labelledby="dogs-title">
          <div className="section-heading">
            <div>
              <p className="dashboard-eyebrow">MITT KONTO</p>
              <h2 id="dogs-title">Mina hundar</h2>
            </div>
            <span className="module-count">{String(dogs.length).padStart(2, '0')}</span>
          </div>

          <div className="dogs-content">
            <form className="dog-form" onSubmit={handleDogSubmit}>
              <p className="module-kicker">NY HUND</p>
              <h3>Registrera hund</h3>
              <div className="dog-fields">
                <label>
                  Hundens namn
                  <input
                    type="text"
                    value={dogName}
                    onChange={(event) => setDogName(event.target.value)}
                    maxLength={100}
                    autoComplete="off"
                    required
                  />
                </label>
                <label>
                  Ras <span>(valfritt)</span>
                  <input
                    type="text"
                    value={dogBreed}
                    onChange={(event) => setDogBreed(event.target.value)}
                    maxLength={100}
                  />
                </label>
                <label>
                  Födelsedatum <span>(valfritt)</span>
                  <input
                    type="date"
                    value={dogBirthDate}
                    onChange={(event) => setDogBirthDate(event.target.value)}
                  />
                </label>
              </div>
              {dogError && <p className="dog-feedback dog-error" role="alert">{dogError}</p>}
              {dogNotice && <p className="dog-feedback dog-success" role="status">{dogNotice}</p>}
              <button className="dog-submit" type="submit" disabled={savingDog || !profile?.id}>
                {savingDog ? 'Sparar...' : 'Lägg till hund'}
              </button>
            </form>

            <div className="dogs-list" aria-live="polite">
              {dogsLoading && <p className="dogs-empty">Hämtar hundar...</p>}
              {!dogsLoading && !dogError && dogs.length === 0 && (
                <p className="dogs-empty">Inga hundar registrerade ännu.</p>
              )}
              {!dogsLoading && dogs.map((dog) => (
                <Link className="dog-row dog-row-link" to={`/dogs/${dog.id}`} key={dog.id}>
                  <div>
                    <h3>{dog.name}</h3>
                    <p>
                      {[dog.breed, formatBirthDate(dog.birth_date)].filter(Boolean).join(' · ') || 'Uppgifter kan kompletteras senare'}
                    </p>
                  </div>
                  <span className="dog-owner-label">MIN HUND</span>
                  <span className="dog-row-arrow" aria-hidden="true">→</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {isAdmin && (
          <section className="dashboard-modules" aria-labelledby="modules-title">
            <div className="section-heading">
              <div>
                <p className="dashboard-eyebrow">ADMINISTRATION</p>
                <h2 id="modules-title">Verktyg</h2>
              </div>
              <span className="module-count">01</span>
            </div>
            <article className="module-row">
              <div className="module-marker" aria-hidden="true">P</div>
              <div className="module-copy">
                <p className="module-kicker">MEDLEMMAR</p>
                <h3>Personregister</h3>
                <p>Medlemskonton och ansökningar om åtkomst.</p>
              </div>
              <Link className="module-link" to="/personregister" aria-label="Öppna Personregister">
                <span>Öppna</span><span aria-hidden="true">→</span>
              </Link>
            </article>
          </section>
        )}

        <footer className="dashboard-footer">
          <span>{profile?.email}</span>
          <span className="account-role">{isAdmin ? 'Administratör' : 'Medlem'}</span>
        </footer>
      </main>
    </div>
  )
}
