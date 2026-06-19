import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

export const SUPERADMIN_EMAIL = 'superadmin@tenseiph.com'

/******************************************************************************/
/* Processing Hierarchy                                                       */
/******************************************************************************/
// findUserProfile    (1.0) Find the authenticated user's Firestore profile.
// resolveAuthSession (2.0) Validate role and build the application session.
// signInAuthorizedUser (3.0) Authenticate an Admin or Superadmin.
// observeAuthState   (4.0) Observe and validate the persisted session.
// signOutUser        (5.0) End the current Firebase session.

/**
 * <Layer number> (1.0)
 *
 * <Processing name> findUserProfile
 * <Function> Find a profile by Auth UID with an email fallback.
 *
 * @param {import('firebase/auth').User} user Firebase Auth user.
 * @return {Promise<Object|null>} Matching Firestore profile.
 */
async function findUserProfile(user) {
  if (!db) return null

  const profileSnapshot = await getDoc(doc(db, 'users', user.uid))
  if (profileSnapshot.exists()) {
    return { id: profileSnapshot.id, ...profileSnapshot.data() }
  }

  const emailSnapshot = await getDocs(query(
    collection(db, 'users'),
    where('email', '==', user.email),
    limit(1),
  ))
  if (emailSnapshot.empty) return null

  const profileDocument = emailSnapshot.docs[0]
  return { id: profileDocument.id, ...profileDocument.data() }
}

/**
 * <Layer number> (2.0)
 *
 * <Processing name> resolveAuthSession
 * <Function> Validate an authorized role and build its scoped session.
 *
 * @param {import('firebase/auth').User} user Firebase Auth user.
 * @return {Promise<Object|null>} Authorized application session.
 */
async function resolveAuthSession(user) {
  if (user.email === SUPERADMIN_EMAIL) {
    return {
      user,
      role: 'SuperAdmin',
      division: null,
      displayName: 'Superadmin Profile',
    }
  }

  const profile = await findUserProfile(user)
  const role = String(profile?.role || '').toLowerCase()
  if (role !== 'admin' || profile?.isActive === false || !profile?.division) {
    return null
  }

  const displayName = [profile.firstName, profile.lastName]
    .filter(Boolean)
    .join(' ') || profile.email || 'Admin Profile'

  return {
    user,
    profile,
    role: 'Admin',
    division: profile.division,
    displayName,
  }
}

/**
 * <Layer number> (3.0)
 *
 * <Processing name> signInAuthorizedUser
 * <Function> Authenticate and authorize an Admin or Superadmin account.
 *
 * @param {string} email Login email address.
 * @param {string} password Login password.
 * @return {Promise<Object>} Authorized application session.
 */
export async function signInAuthorizedUser(email, password) {
  if (!auth) throw new Error('Invalid credentials.')

  const credential = await signInWithEmailAndPassword(
    auth,
    email.trim(),
    password,
  )
  const session = await resolveAuthSession(credential.user)
  if (!session) {
    await signOut(auth)
    throw new Error('Invalid credentials.')
  }

  return session
}

/**
 * <Layer number> (4.0)
 *
 * <Processing name> observeAuthState
 * <Function> Observe and validate persisted Admin or Superadmin sessions.
 *
 * @param {(session: Object|null) => void} callback Auth state callback.
 * @return {import('firebase/auth').Unsubscribe} Auth observer unsubscribe.
 */
export function observeAuthState(callback) {
  if (!auth) {
    callback(null)
    return () => {}
  }

  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback(null)
      return
    }

    try {
      const session = await resolveAuthSession(user)
      if (!session) await signOut(auth)
      callback(session)
    } catch {
      await signOut(auth).catch(() => {})
      callback(null)
    }
  }, () => callback(null))
}

/**
 * <Layer number> (5.0)
 *
 * <Processing name> signOutUser
 * <Function> End the active Firebase authentication session.
 *
 * @return {Promise<void>}
 */
export async function signOutUser() {
  if (auth) await signOut(auth)
}
