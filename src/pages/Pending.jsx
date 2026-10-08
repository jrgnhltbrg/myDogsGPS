import { useAuth } from '../context/AuthContext'

export function Pending() {
  const { profile, signOut } = useAuth()

  const message =
    profile?.status === 'rejected'
      ? 'Ditt konto har tyvärr nekats av administratören.'
      : 'Ditt konto väntar på godkännande från en administratör.'

  return (
    <div>
      <h1>Väntar på godkännande</h1>
      <p>{message}</p>
      <button type="button" onClick={signOut}>
        Logga ut
      </button>
    </div>
  )
}
