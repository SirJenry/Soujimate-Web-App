import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'
import {
  deleteObject,
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
} from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import { getShiftDate } from '@/utils/receiptUtils'

export const MAX_RECEIPT_PHOTOS = 3
export const MAX_SOURCE_FILE_BYTES = 10 * 1024 * 1024

/******************************************************************************/
/* Processing Hierarchy                                                       */
/******************************************************************************/
// loadImage              (1.0) Decode a browser image file.
// compressReceiptImage   (2.0) Resize and compress a receipt image.
// getUserReceipt         (3.0) Load the current shift submission.
// uploadReceiptImage     (4.0) Upload one image to Firebase Storage.
// removeUploadedImages   (5.0) Remove files after a failed submission.
// submitUserReceipt      (6.0) Upload images and create the receipt record.

/**
 * <Layer number> (1.0)
 *
 * <Processing name> loadImage
 * <Function> Decode an image file while respecting browser orientation.
 *
 * @param {File} file Source image file.
 * @return {Promise<ImageBitmap|HTMLImageElement>} Decoded browser image.
 */
async function loadImage(file) {
  if ('createImageBitmap' in window) {
    return createImageBitmap(file, { imageOrientation: 'from-image' })
  }

  const source = URL.createObjectURL(file)

  try {
    return await new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('The selected image is invalid.'))
      image.src = source
    })
  } finally {
    URL.revokeObjectURL(source)
  }
}

/**
 * <Layer number> (2.0)
 *
 * <Processing name> compressReceiptImage
 * <Function> Validate, resize, and compress an image for receipt storage.
 *
 * @param {File} file User-selected image file.
 * @return {Promise<Blob>} Compressed JPEG image.
 */
export async function compressReceiptImage(file) {
  if (!(file instanceof File) || !file.type.startsWith('image/')) {
    throw new Error('Please select a valid image file.')
  }
  if (file.size > MAX_SOURCE_FILE_BYTES) {
    throw new Error('Each original image must be smaller than 10 MB.')
  }

  const image = await loadImage(file)
  const maxDimension = 1600
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height))
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d', { alpha: false })
  if (!context) throw new Error('This browser cannot process the image.')

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.drawImage(image, 0, 0, width, height)
  if (typeof image.close === 'function') image.close()

  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.82)
  })
  if (!blob) throw new Error('The image could not be compressed.')

  return blob
}

/**
 * <Layer number> (3.0)
 *
 * <Processing name> getUserReceipt
 * <Function> Load one user's receipt for the active shift date.
 *
 * @param {string} userId Authenticated Firebase user UID.
 * @param {string} shiftDate Shift date in YYYY-MM-DD format.
 * @return {Promise<Object|null>} Existing receipt or null.
 */
export async function getUserReceipt(userId, shiftDate = getShiftDate()) {
  if (!db) throw new Error('Firebase is not configured.')

  const snapshot = await getDoc(doc(
    db,
    'cleaning',
    userId,
    'submissions',
    shiftDate,
  ))

  return snapshot.exists()
    ? { id: snapshot.id, ...snapshot.data() }
    : null
}

/**
 * <Layer number> (4.0)
 *
 * <Processing name> uploadReceiptImage
 * <Function> Upload one compressed receipt image to Firebase Storage.
 *
 * @param {string} userId Authenticated Firebase user UID.
 * @param {string} shiftDate Active shift date.
 * @param {Blob} image Compressed receipt image.
 * @param {number} index Zero-based image index.
 * @return {Promise<{path: string, url: string}>} Storage path and URL.
 */
async function uploadReceiptImage(userId, shiftDate, image, index) {
  const uniqueName = `${Date.now()}-${crypto.randomUUID()}-${index + 1}.jpg`
  const path = `users/${userId}/receipts/${shiftDate}/${uniqueName}`
  const reference = storageRef(storage, path)
  const snapshot = await uploadBytes(reference, image, {
    contentType: 'image/jpeg',
    customMetadata: { shiftDate, userId },
  })

  return {
    path,
    url: await getDownloadURL(snapshot.ref),
  }
}

/**
 * <Layer number> (5.0)
 *
 * <Processing name> removeUploadedImages
 * <Function> Best-effort cleanup of images from a failed receipt creation.
 *
 * @param {Array<{path: string}>} uploads Newly uploaded image records.
 * @return {Promise<void>}
 */
async function removeUploadedImages(uploads) {
  await Promise.allSettled(uploads.map((upload) => (
    deleteObject(storageRef(storage, upload.path))
  )))
}

/**
 * <Layer number> (6.0)
 *
 * <Processing name> submitUserReceipt
 * <Function> Upload receipt images and create one daily Firestore record.
 *
 * @param {Object} options Submission options.
 * @param {Object} options.session Authenticated User session.
 * @param {Blob[]} options.images Compressed receipt images.
 * @param {(completed: number, total: number) => void} options.onProgress
 * Upload progress callback.
 * @return {Promise<Object>} Created receipt data.
 */
export async function submitUserReceipt({ session, images, onProgress }) {
  if (!db || !storage) throw new Error('Firebase is not configured.')
  if (!session?.user?.uid) throw new Error('Your secure session has expired.')
  if (!Array.isArray(images) || images.length === 0) {
    throw new Error('Please add at least one receipt photo.')
  }
  if (images.length > MAX_RECEIPT_PHOTOS) {
    throw new Error(`Only ${MAX_RECEIPT_PHOTOS} receipt photos are allowed.`)
  }

  const userId = session.user.uid
  const profile = session.profile || {}
  const assignedArea = profile.assignedArea || profile.assigned_area || ''
  if (!assignedArea || assignedArea === 'No Area') {
    throw new Error('No area is assigned to your account. Contact an Admin.')
  }

  const shiftDate = getShiftDate()
  const submissionReference = doc(
    db,
    'cleaning',
    userId,
    'submissions',
    shiftDate,
  )
  const existing = await getDoc(submissionReference)
  if (existing.exists()) {
    throw new Error('You have already submitted a receipt for this shift.')
  }

  const uploads = []

  try {
    for (const [index, image] of images.entries()) {
      uploads.push(await uploadReceiptImage(userId, shiftDate, image, index))
      onProgress?.(uploads.length, images.length)
    }

    const imageUrls = uploads.map((upload) => upload.url)
    const assignedTasks = typeof profile.assignedTasks === 'object'
      && profile.assignedTasks !== null
      ? profile.assignedTasks
      : {}
    const receiptData = {
      assignedArea,
      assignedTasks,
      division: profile.division || '',
      email: session.user.email || profile.email || '',
      firstName: profile.firstName || '',
      hasReceipt: true,
      imageCount: imageUrls.length,
      imageData: imageUrls[0],
      lastName: profile.lastName || '',
      receiptImage: imageUrls[0],
      receiptImages: imageUrls,
      receiptStoragePaths: uploads.map((upload) => upload.path),
      rotationNumber: profile.rotationNumber || '',
      submissionDate: shiftDate,
      timestamp: serverTimestamp(),
      userId,
    }

    await runTransaction(db, async (transaction) => {
      const current = await transaction.get(submissionReference)
      if (current.exists()) {
        throw new Error('You have already submitted a receipt for this shift.')
      }
      transaction.set(submissionReference, receiptData)
    })

    return { ...receiptData, timestamp: new Date() }
  } catch (error) {
    await removeUploadedImages(uploads)
    throw error
  }
}
