import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const requiredKeys = ['apiKey', 'authDomain', 'projectId']
const isConfigured = requiredKeys.every(
  (key) => firebaseConfig[key] && firebaseConfig[key].length > 0,
)

let app = null
let auth = null
let db = null

if (isConfigured) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
    auth = getAuth(app)
    db = getFirestore(app)
    if (import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
      connectAuthEmulator(auth, 'http://localhost:9099')
      connectFirestoreEmulator(db, 'localhost', 8080)
    }
  } catch (error) {
    console.error('Firebase initialization failed:', error)
  }
} else {
  console.warn(
    'Firebase is not configured. Set VITE_FIREBASE_API_KEY, ' +
    'VITE_FIREBASE_AUTH_DOMAIN, and VITE_FIREBASE_PROJECT_ID env vars.',
  )
}

export { auth, db }

export default app
