import { buffer as turfBuffer } from '@turf/buffer'
import L from 'leaflet'
import { useEffect, useRef, useState } from 'react'
import { CircleMarker, GeoJSON, MapContainer, Polyline, TileLayer, useMap } from 'react-leaflet'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import 'leaflet/dist/leaflet.css'
import './Dashboard.css'
import './DogSearch.css'

const DEFAULT_CENTER = { latitude: 59.3293, longitude: 18.0686 }

function getPositionError(error) {
  if (!window.isSecureContext) {
    return 'Telefonens platsåtkomst kräver en säker HTTPS-adress. Öppna den publicerade sidan eller en HTTPS-förhandsvisning.'
  }
  if (error.code === 1) return 'Tillåt platsåtkomst i webbläsaren för att spela in sökstigen.'
  if (error.code === 2) return 'Telefonen kunde inte hitta din position. Försök igen utomhus.'
  if (error.code === 3) return 'Det tog för lång tid att hitta din position. Försök igen.'
  return 'Kunde inte läsa telefonens position.'
}

function MapViewport({ center, areaFeature }) {
  const map = useMap()

  useEffect(() => {
    if (areaFeature) {
      const bounds = L.geoJSON(areaFeature).getBounds()
      if (bounds.isValid()) map.fitBounds(bounds.pad(0.12), { maxZoom: 17 })
      return
    }
    if (center) map.setView([center.latitude, center.longitude], center.zoom ?? 16)
  }, [areaFeature, center, map])

  return null
}

function distanceBetween(first, second) {
  const radians = (degrees) => (degrees * Math.PI) / 180
  const earthRadius = 6371000
  const latitudeDelta = radians(second.latitude - first.latitude)
  const longitudeDelta = radians(second.longitude - first.longitude)
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(first.latitude)) *
      Math.cos(radians(second.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2
  return 2 * earthRadius * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
}

function getTrackDistance(points) {
  return points.slice(1).reduce((distance, point, index) => {
    return distance + distanceBetween(points[index], point)
  }, 0)
}

function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`
}

function formatCreatedAt(date) {
  return new Intl.DateTimeFormat('sv-SE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))
}

function geoJsonFeature(points, geometryType) {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: geometryType,
      coordinates: points.map((point) => [point.longitude, point.latitude]),
    },
  }
}

export function DogSearch() {
  const { dogId } = useParams()
  const { profile } = useAuth()
  const watchIdRef = useRef(null)
  const pointsRef = useRef([])
  const [dog, setDog] = useState(null)
  const [savedAreas, setSavedAreas] = useState([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState(null)
  const [currentLocation, setCurrentLocation] = useState(null)
  const [mapCenter, setMapCenter] = useState({ ...DEFAULT_CENTER, zoom: 5 })
  const [locationMessage, setLocationMessage] = useState('Hämtar din position...')
  const [points, setPoints] = useState([])
  const [recording, setRecording] = useState(false)
  const [routeFeature, setRouteFeature] = useState(null)
  const [areaFeature, setAreaFeature] = useState(null)
  const [areaName, setAreaName] = useState('')
  const [selectedAreaId, setSelectedAreaId] = useState(null)
  const [recordError, setRecordError] = useState(null)
  const [saveMessage, setSaveMessage] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!profile?.id) return

    let cancelled = false

    async function loadSearchPage() {
      const [dogResult, areaResult] = await Promise.all([
        supabase
          .from('dogs')
          .select('id, name, breed')
          .eq('id', dogId)
          .eq('owner_id', profile.id)
          .maybeSingle(),
        supabase
          .from('dog_search_areas')
          .select('id, name, route_geojson, area_geojson, created_at')
          .eq('dog_id', dogId)
          .order('created_at', { ascending: false }),
      ])

      if (cancelled) return
      if (dogResult.error || !dogResult.data) {
        setPageError('Hunden hittades inte på ditt konto.')
      } else if (areaResult.error) {
        setDog(dogResult.data)
        setPageError('Sökytorna kunde inte hämtas. Kontrollera att add_search_areas.sql har körts i Supabase.')
      } else {
        setDog(dogResult.data)
        setSavedAreas(areaResult.data ?? [])
      }
      setLoading(false)
    }

    loadSearchPage()
    return () => {
      cancelled = true
    }
  }, [dogId, profile?.id])

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationMessage('Den här enheten kan inte läsa position i webbläsaren.')
      return undefined
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }
        setCurrentLocation(nextLocation)
        setMapCenter({ ...nextLocation, zoom: 16 })
        setLocationMessage(`Din position hittad · noggrannhet cirka ${Math.round(position.coords.accuracy)} m`)
      },
      (error) => setLocationMessage(getPositionError(error)),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    )

    return undefined
  }, [])

  useEffect(() => () => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current)
    }
  }, [])

  function clearRecordingWatch() {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }

  function handleStartRecording() {
    setRecordError(null)
    setSaveMessage(null)
    setSelectedAreaId(null)
    setAreaFeature(null)
    setRouteFeature(null)
    setAreaName('')

    if (!currentLocation || !navigator.geolocation) {
      setRecordError('Din position saknas. Tillåt platsåtkomst och försök igen.')
      return
    }

    const initialPoints = [currentLocation]
    pointsRef.current = initialPoints
    setPoints(initialPoints)
    setRecording(true)

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const nextLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }
        setCurrentLocation(nextLocation)
        setMapCenter({ ...nextLocation, zoom: 16 })

        setPoints((currentPoints) => {
          const previous = currentPoints.at(-1)
          if (previous && distanceBetween(previous, nextLocation) < 3) return currentPoints
          const nextPoints = [...currentPoints, nextLocation]
          pointsRef.current = nextPoints
          return nextPoints
        })
      },
      (error) => {
        clearRecordingWatch()
        setRecording(false)
        setRecordError(getPositionError(error))
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 1000 },
    )
  }

  function handleStopRecording() {
    clearRecordingWatch()
    setRecording(false)
    setRecordError(null)

    const recordedPoints = pointsRef.current
    if (recordedPoints.length < 2 || getTrackDistance(recordedPoints) < 4) {
      setRecordError('Spela in en längre sträcka innan du stoppar inspelningen.')
      return
    }

    const nextRoute = geoJsonFeature(recordedPoints, 'LineString')
    const nextArea = turfBuffer(nextRoute, 0.05, { units: 'kilometers' })
    if (!nextArea) {
      setRecordError('Sökytan kunde inte skapas. Spela in sträckan igen.')
      return
    }

    setRouteFeature(nextRoute)
    setAreaFeature(nextArea)
    setSelectedAreaId(null)
    setAreaName(`Sökområde ${new Intl.DateTimeFormat('sv-SE').format(new Date())}`)
  }

  function handleSelectArea(area) {
    setRecordError(null)
    setSaveMessage(null)
    setSelectedAreaId(area.id)
    setAreaName(area.name)
    setRouteFeature(area.route_geojson)
    setAreaFeature(area.area_geojson)
    setPoints([])
    pointsRef.current = []
  }

  async function handleSaveArea(event) {
    event.preventDefault()
    setRecordError(null)
    setSaveMessage(null)
    setSaving(true)

    const { data, error } = await supabase
      .from('dog_search_areas')
      .insert({
        owner_id: profile.id,
        dog_id: dog.id,
        name: areaName.trim(),
        route_geojson: routeFeature,
        area_geojson: areaFeature,
      })
      .select('id, name, route_geojson, area_geojson, created_at')
      .single()

    if (error) {
      setRecordError(`Sökytan kunde inte sparas: ${error.message}`)
    } else {
      setSavedAreas((currentAreas) => [data, ...currentAreas])
      setSelectedAreaId(data.id)
      setSaveMessage('Sökytan är sparad och kan väljas senare.')
    }
    setSaving(false)
  }

  const trackDistance = getTrackDistance(points)
  const mapFeatures = {
    type: 'FeatureCollection',
    features: [routeFeature, areaFeature].filter(Boolean),
  }

  return (
    <div className="dashboard-page search-page">
      <header className="dashboard-header">
        <Link className="dashboard-brand" to="/dashboard" aria-label="myDogGPS startsida">
          <img src="/stimmos_logo.png" alt="" />
          <span>myDogGPS</span>
        </Link>
        <nav className="dashboard-nav" aria-label="Huvudmeny">
          {dog && <Link to={`/dogs/${dog.id}`}>Till {dog.name}</Link>}
          <Link to="/dashboard">Mina hundar</Link>
        </nav>
      </header>

      <main className="search-main">
        {loading && <p className="dog-page-message">Hämtar sökverktyget...</p>}
        {!loading && pageError && <p className="dog-page-message dog-page-error" role="alert">{pageError}</p>}
        {!loading && dog && (
          <>
            <div className="search-heading">
              <div>
                <Link className="back-link" to={`/dogs/${dog.id}`}>← Till {dog.name}</Link>
                <p className="dashboard-eyebrow">SÖK · {dog.name.toUpperCase()}</p>
                <h1>Spela in sökstig</h1>
                <p className="search-intro">Gå sträckan med telefonen. Sökområdet täcker 50 meter på varje sida om stigen.</p>
              </div>
              <span className={`recording-indicator${recording ? ' is-recording' : ''}`}>
                <span aria-hidden="true" />
                {recording ? 'SPELAR IN' : 'INTE AKTIV'}
              </span>
            </div>

            <div className="search-workspace">
              <section className="search-map-section" aria-label="Karta över sökområdet">
                <MapContainer
                  className="search-map"
                  center={[mapCenter.latitude, mapCenter.longitude]}
                  zoom={mapCenter.zoom}
                  scrollWheelZoom
                  zoomControl={false}
                >
                  <MapViewport center={mapCenter} areaFeature={selectedAreaId ? areaFeature : null} />
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {currentLocation && (
                    <CircleMarker
                      center={[currentLocation.latitude, currentLocation.longitude]}
                      radius={8}
                      pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#286b54', fillOpacity: 1 }}
                    />
                  )}
                  {routeFeature && areaFeature && (
                    <GeoJSON
                      key={selectedAreaId ?? `draft-${points.length}-${areaName}`}
                      data={mapFeatures}
                      style={(feature) => feature.geometry.type === 'LineString'
                        ? { color: '#1e493d', weight: 4, opacity: 0.95 }
                        : { color: '#ca694f', weight: 2, fillColor: '#e6a274', fillOpacity: 0.25 }}
                    />
                  )}
                  {recording && points.length > 1 && (
                    <Polyline
                      positions={points.map((point) => [point.latitude, point.longitude])}
                      pathOptions={{ color: '#1e493d', weight: 4 }}
                    />
                  )}
                </MapContainer>
                <div className="map-attribution-note">Kartdata © OpenStreetMap</div>
              </section>

              <aside className="search-controls">
                <div className="location-status" role="status">
                  <span className={currentLocation ? 'location-dot is-ready' : 'location-dot'} aria-hidden="true" />
                  <p>{locationMessage}</p>
                </div>

                <div className="recording-controls">
                  <p className="module-kicker">STEG 1</p>
                  <h2>{recording ? 'Gå din sökstig' : 'Spela in sträckan'}</h2>
                  <p className="recording-description">
                    {recording
                      ? 'Gå från start till slut. Telefonens position läggs till automatiskt.'
                      : 'Ställ dig vid startpunkten och starta inspelningen när du är redo.'}
                  </p>
                  <div className="recording-stats">
                    <span>{points.length} positioner</span>
                    <span>{formatDistance(trackDistance)}</span>
                  </div>
                  {!recording ? (
                    <button
                      className="record-button"
                      type="button"
                      onClick={handleStartRecording}
                      disabled={!currentLocation}
                    >
                      <span className="record-button-dot" aria-hidden="true" />
                      Starta inspelning
                    </button>
                  ) : (
                    <button className="stop-button" type="button" onClick={handleStopRecording}>
                      Stoppa och skapa sökyta
                    </button>
                  )}
                </div>

                {areaFeature && !selectedAreaId && (
                  <form className="save-area-form" onSubmit={handleSaveArea}>
                    <p className="module-kicker">SÖKYTA SKAPAD</p>
                    <h2>Spara till {dog.name}</h2>
                    <p className="area-summary">Området visas i kartan · 50 m på vardera sidan</p>
                    <label htmlFor="area-name">Namn på sökytan</label>
                    <input
                      id="area-name"
                      value={areaName}
                      onChange={(event) => setAreaName(event.target.value)}
                      maxLength={100}
                      required
                    />
                    <button className="save-area-button" type="submit" disabled={saving || !areaName.trim()}>
                      {saving ? 'Sparar...' : 'Spara sökyta'}
                    </button>
                  </form>
                )}

                {recordError && <p className="search-feedback search-error" role="alert">{recordError}</p>}
                {saveMessage && <p className="search-feedback search-success" role="status">{saveMessage}</p>}

                <section className="saved-areas" aria-labelledby="saved-areas-title">
                  <div className="saved-areas-heading">
                    <div>
                      <p className="module-kicker">SPARADE STRÄCKOR</p>
                      <h2 id="saved-areas-title">Sökområden</h2>
                    </div>
                    <span>{String(savedAreas.length).padStart(2, '0')}</span>
                  </div>
                  {savedAreas.length === 0 ? (
                    <p className="saved-areas-empty">Sparade sökytor för {dog.name} visas här.</p>
                  ) : (
                    <ul>
                      {savedAreas.map((area) => (
                        <li key={area.id}>
                          <div>
                            <strong>{area.name}</strong>
                            <span>{formatCreatedAt(area.created_at)}</span>
                          </div>
                          <button
                            type="button"
                            className={selectedAreaId === area.id ? 'area-select is-selected' : 'area-select'}
                            onClick={() => handleSelectArea(area)}
                            aria-pressed={selectedAreaId === area.id}
                          >
                            {selectedAreaId === area.id ? 'Visas' : 'Visa'}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </aside>
            </div>
          </>
        )}
      </main>
    </div>
  )
}