import { useGoogleLogin } from '@react-oauth/google'

interface Props {
  onLogin: (token: string, expiresIn: number) => void
  onDemo: () => void
}

export default function Login({ onLogin, onDemo }: Props) {
  const login = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/calendar',
    onSuccess: r => onLogin(r.access_token, r.expires_in),
    onError: () => alert('Google sign-in failed. Check your client ID configuration.'),
  })

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h1 style={styles.logo}>Plan-IT 🪐</h1>
        <p style={styles.tagline}>Sprint planning, powered by your Google Calendar.</p>
        <button style={styles.btn} onClick={() => login()}>
          <svg width="18" height="18" viewBox="0 0 18 18" style={{ marginRight: 8, flexShrink: 0 }}>
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
          </svg>
          Sign in with Google
        </button>

        <div style={styles.divider}>
          <span style={styles.dividerLine} />
          <span style={styles.dividerText}>or</span>
          <span style={styles.dividerLine} />
        </div>

        <button style={styles.demoBtn} onClick={onDemo}>
          Try Demo — no sign-in required
        </button>

        <p style={styles.note}>
          Plan-IT stores your projects, sprints, and tasks as Google Calendar events —
          no separate database required.
        </p>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
  },
  card: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 16,
    padding: '48px 40px',
    textAlign: 'center',
    maxWidth: 400,
    width: '100%',
    boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
  },
  logo: {
    fontSize: 32,
    fontWeight: 700,
    color: '#f8fafc',
    marginBottom: 8,
    letterSpacing: '-0.5px',
  },
  tagline: {
    color: '#94a3b8',
    marginBottom: 32,
    fontSize: 15,
  },
  btn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#fff',
    color: '#1e293b',
    border: 'none',
    borderRadius: 8,
    padding: '12px 24px',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
    marginBottom: 20,
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    margin: '4px 0',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: '#334155',
  },
  dividerText: {
    color: '#475569',
    fontSize: 13,
  },
  demoBtn: {
    display: 'block',
    width: '100%',
    background: 'none',
    border: '1px solid #334155',
    borderRadius: 8,
    padding: '12px 24px',
    fontSize: 14,
    fontWeight: 500,
    color: '#94a3b8',
    cursor: 'pointer',
    marginBottom: 20,
  },
  note: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 1.5,
  },
}
