import {
  collection,
  doc,
  getDoc,
  getDocs,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

/**
 * Firestore dashboard data mapping verified from live collection reads:
 *
 * Employee source:
 * - Collection: users
 * - ID field: document ID (matches userId)
 * - Name fields: firstName and lastName
 * - Email field: email
 * - Role field: role (User, Admin, SuperAdmin)
 * - Active field: isActive
 * - Department/division field: division
 *
 * Cleaning submission source:
 * - Path: cleaning/{userId}/submissions/{YYYY-MM-DD}
 * - User link: parent cleaning document ID
 * - Date source: submission document ID and submissionDate
 * - Timestamp field: timestamp
 * - Status field: not found; record existence means submitted
 *
 * Assignment source:
 * - Collection: users
 * - Area field: assignedArea; assigned_area is the legacy fallback
 * - Task field: assignedTask; assigned_task is the legacy fallback
 */

/**
 * <Layer number> (1.0)
 *
 * <Processing name> fetchDashboardRecords
 * <Function> Fetch employees and their submission for the selected date.
 *
 * @param {string} selectedDate Selected date in YYYY-MM-DD format.
 * @return {Promise<{users: Array, submissions: Array}>}
 */
export async function fetchDashboardRecords(selectedDate) {
  const usersSnapshot = await getDocs(collection(db, 'users'))
  const users = usersSnapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  }))
  const employees = users.filter((user) => (
    user.role === 'User' && user.isActive === true
  ))
  const submissionSnapshots = await Promise.all(
    employees.map((employee) => {
      const userId = employee.userId || employee.id

      return getDoc(
        doc(db, 'cleaning', userId, 'submissions', selectedDate),
      )
    }),
  )
  const submissions = submissionSnapshots.flatMap((snapshot, index) => {
    if (!snapshot.exists()) return []

    const employee = employees[index]
    const userId = employee.userId || employee.id

    return [{
      id: snapshot.id,
      ...snapshot.data(),
      userId,
      submissionDate: snapshot.data().submissionDate || snapshot.id,
    }]
  })

  return {
    users,
    submissions,
  }
}
