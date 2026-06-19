import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

/******************************************************************************/
/* Processing Hierarchy                                                       */
/******************************************************************************/
// fetchAdminDashboardRecords (1.0) Fetch one division's daily records.

/**
 * <Layer number> (1.0)
 *
 * <Processing name> fetchAdminDashboardRecords
 * <Function> Fetch active employees and submissions for one division.
 *
 * @param {string} division Assigned admin division.
 * @param {string} selectedDate Selected date in YYYY-MM-DD format.
 * @return {Promise<{users: Array, submissions: Array}>}
 */
export async function fetchAdminDashboardRecords(division, selectedDate) {
  if (!db) {
    throw new Error('Firebase is not configured.')
  }

  const usersSnapshot = await getDocs(query(
    collection(db, 'users'),
    where('division', '==', division),
  ))
  const users = usersSnapshot.docs
    .map((document) => ({ id: document.id, ...document.data() }))
    .filter((user) => user.role === 'User' && user.isActive === true)
  const snapshots = await Promise.all(users.map((user) => {
    const userId = user.userId || user.id

    return getDoc(doc(
      db,
      'cleaning',
      userId,
      'submissions',
      selectedDate,
    ))
  }))
  const submissions = snapshots.flatMap((snapshot, index) => {
    if (!snapshot.exists()) return []

    const userId = users[index].userId || users[index].id

    return [{
      id: snapshot.id,
      ...snapshot.data(),
      userId,
      submissionDate: snapshot.data().submissionDate || snapshot.id,
    }]
  })

  return { users, submissions }
}
