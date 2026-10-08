import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import './Dashboard.css'
import './DogOverview.css'

function formatBirthDate(date) {
  if (!date) return null
  return new Intl.DateTimeFormat('sv-SE').format(new Date(`${date}T12:00:00`))
}

export function DogOverview() {
  const { dogId } = useParams()
  const { profile } = useAuth()
  const [dog, setDog] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!profile?.id) return

    let cancelled = false

    async function loadDog() {
      const { data, error: loadError } = await supabase
        .from('dogs')
        .select('id, name, breed, birth_date')
        .eq('id', dogId)
        .eq('owner_id', profile.id)
        .maybeSingle()

      if (cancelled) return
      if (loadError) setError('Hundens uppgifter kunde inte hämtas.')
      else if (!data) setError('Hunden hittades inte på ditt konto.')
      else setDog(data)
      setLoading(false)
    }

    loadDog()
    return () => {
      cancelled = true
    }
  }, [dogId, profile?.id])

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <Link className="dashboard-brand" to="/dashboard" aria-label="myDogGPS startsida">
          <img src="/stimmos_logo.png" alt="" />
          <span>myDogGPS</span>
        </Link>
        <nav className="dashboard-nav" aria-label="Huvudmeny">
          <Link to="/dashboard">Mina hundar</Link>
        </nav>
      </header>

      <main className="dashboard-main dog-overview-main">
        <Link className="back-link" to="/dashboard">← Till mina hundar</Link>
        {loading && <p className="dog-page-message">Hämtar hundens uppgifter...</p>}
        {!loading && error && <p className="dog-page-message dog-page-error" role="alert">{error}</p>}
        {!loading && dog && (
          <>
            <section className="dog-profile-heading">
              <p className="dashboard-eyebrow">PERSONLIG ÖVERSIKT</p>
              <h1>{dog.name}</h1>
              <p className="dog-profile-details">
                {[dog.breed, formatBirthDate(dog.birth_date)].filter(Boolean).join(' · ') || 'Hund på ditt konto'}
              </p>
            </section>

            <section className="dog-activities" aria-labelledby="dog-activities-title">
              <div className="section-heading">
                <div>
                  <p className="dashboard-eyebrow">VÄLJ AKTIVITET</p>
                  <h2 id="dog-activities-title">Vad ska ni göra?</h2>
                </div>
              </div>

              <div className="activity-options">
                <Link className="activity-option activity-option-ready" to={`/dogs/${dog.id}/search`}>
                  <span className="activity-number">01</span>
                  <span className="activity-copy">
                    <strong>Sök</strong>
                    <span>Spela in en sökstig och skapa sökområde.</span>
                  </span>
                  <span className="activity-arrow" aria-hidden="true">→</span>
                </Link>
                <div className="activity-option activity-option-pending" aria-disabled="true">
                  <span className="activity-number">02</span>
                  <span className="activity-copy">
                    <strong>Spår</strong>
                    <span>GPS-aktivitet kommer senare.</span>
                  </span>
                  <span className="activity-status">KOMMER SENARE</span>
                </div>
                <div className="activity-option activity-option-pending" aria-disabled="true">
                  <span className="activity-number">03</span>
                  <span className="activity-copy">
                    <strong>Rapport</strong>
                    <span>GPS-aktivitet kommer senare.</span>
                  </span>
                  <span className="activity-status">KOMMER SENARE</span>
                </div>
              </div>
            </section>

            <section className="dog-history" aria-labelledby="dog-history-title">
              <p className="dashboard-eyebrow">HISTORIK</p>
              <h2 id="dog-history-title">Tidigare aktiviteter</h2>
              <p>Aktivitetshistoriken visas här när hundens GPS-koppling finns på plats.</p>
            </section>
          </>
        )}
      </main>
    </div>
  )
}