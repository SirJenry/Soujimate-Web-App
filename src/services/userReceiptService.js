import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getShiftDate } from '@/utils/receiptUtils'

export const MAX_RECEIPT_PHOTOS = 3
export const MAX_SOURCE_FILE_BYTES = 10 * 1024 * 1024
const MAX_IMAGE_BYTES = 210 * 1024
const MAX_DOCUMENT_BYTES = 900 * 1024

/******************************************************************************/
/* Processing Hierarchy                                                       */
/******************************************************************************/
// loadImage            (1.0) Decode a browser image file.
// canvasToJpeg         (2.0) Encode a canvas as a JPEG blob.
// compressReceiptImage (3.0) Resize and compress a receipt image.
// blobToBase64         (4.0) Convert a JPEG blob into raw Base64.
// getUserReceipt       (5.0) Load the current shift submission.
// submitUserReceipt    (6.0) Create a Base64 Firestore receipt record.

/**
 * <Layer number> (1.0)
 *
 * <Processing name> loadImage
 * <Function> Decode an image file while respecting browser orientation.
 *
 * @param {File|Blob} file Source image file.
 * @return {Promise<ImageBitmap|HTMLImageElement>} Decoded browser image.
 */
async function loadImage(file) {
  if (typeof window.createImageBitmap === 'function') {
    try {
      return await window.createImageBitmap(file, {
        imageOrientation: 'from-image',
      })
    } catch {
      // Safari may expose createImageBitmap without supporting its options.
      // Continue with the broadly supported HTMLImageElement decoder.
    }
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
 * <Processing name> canvasToJpeg
 * <Function> Encode one canvas as a JPEG blob at the requested quality.
 *
 * @param {HTMLCanvasElement} canvas Prepared image canvas.
 * @param {number} quality JPEG quality between zero and one.
 * @return {Promise<Blob>} Encoded JPEG blob.
 */
async function canvasToJpeg(canvas, quality) {
  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', quality)
  })
  if (!blob) throw new Error('The image could not be compressed.')

  return blob
}

/**
 * <Layer number> (3.0)
 *
 * <Processing name> compressReceiptImage
 * <Function> Match Android's 800px JPEG flow within a Firestore-safe budget.
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
  const maxDimension = 800
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

  const qualityLevels = [0.7, 0.6, 0.5, 0.42]
  let blob = null

  for (const quality of qualityLevels) {
    blob = await canvasToJpeg(canvas, quality)
    if (blob.size <= MAX_IMAGE_BYTES) break
  }

  if (!blob || blob.size > MAX_IMAGE_BYTES) {
    throw new Error(
      'This photo remains too large after compression. Try a closer photo.',
    )
  }

  return blob
}

/**
 * <Layer number> (4.0)
 *
 * <Processing name> blobToBase64
 * <Function> Convert a compressed JPEG blob to Android-compatible Base64.
 *
 * @param {Blob} blob Compressed JPEG image.
 * @return {Promise<string>} Raw Base64 without a data-URI prefix.
 */
async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('A receipt photo could not be read.'))
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      const separator = result.indexOf(',')
      if (separator < 0) {
        reject(new Error('A receipt photo could not be encoded.'))
        return
      }
      resolve(result.slice(separator + 1))
    }
    reader.readAsDataURL(blob)
  })
}

/**
 * <Layer number> (5.0)
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
 * <Layer number> (6.0)
 *
 * <Processing name> submitUserReceipt
 * <Function> Encode images and create one Android-compatible Firestore record.
 *
 * @param {Object} options Submission options.
 * @param {Object} options.session Authenticated User session.
 * @param {Blob[]} options.images Compressed receipt images.
 * @param {(message: string) => void} options.onProgress Progress callback.
 * @return {Promise<Object>} Created receipt data.
 */
export async function submitUserReceipt({ session, images, onProgress }) {
  if (!db) throw new Error('Firebase is not configured.')
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

  const receiptImages = []
  for (const [index, image] of images.entries()) {
    onProgress?.(`Encoding photo ${index + 1} of ${images.length}...`)
    receiptImages.push(await blobToBase64(image))
  }

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
    imageCount: receiptImages.length,
    lastName: profile.lastName || '',
    receiptImages,
    rotationNumber: profile.rotationNumber || '',
    submissionDate: shiftDate,
    timestamp: serverTimestamp(),
    userId,
  }
  const estimatedData = { ...receiptData, timestamp: null }
  const estimatedBytes = new TextEncoder().encode(
    JSON.stringify(estimatedData),
  ).length
  if (estimatedBytes > MAX_DOCUMENT_BYTES) {
    throw new Error(
      'The combined photos are too large for Firestore. Remove one and retry.',
    )
  }

  onProgress?.('Saving receipt to Firestore...')
  await runTransaction(db, async (transaction) => {
    const current = await transaction.get(submissionReference)
    if (current.exists()) {
      throw new Error('You have already submitted a receipt for this shift.')
    }
    transaction.set(submissionReference, receiptData)
  })

  return { ...receiptData, timestamp: new Date() }
}
