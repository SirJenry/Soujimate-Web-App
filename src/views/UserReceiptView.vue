<script setup>
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
} from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import BrandMark from '@/components/BrandMark.vue'
import {
  compressReceiptImage,
  getUserReceipt,
  MAX_RECEIPT_PHOTOS,
  submitUserReceipt,
} from '@/services/userReceiptService'
import {
  getShiftDate,
  normalizeReceiptImageSource,
} from '@/utils/receiptUtils'

const props = defineProps({
  authSession: { type: Object, required: true },
})

const emit = defineEmits(['logout'])

const cameraInput = ref(null)
const galleryInput = ref(null)
const photos = ref([])
const submission = ref(null)
const loading = ref(true)
const processing = ref(false)
const submitting = ref(false)
const uploadProgress = ref('')
const error = ref('')
const success = ref('')

const shiftDate = getShiftDate()
const profile = computed(() => props.authSession.profile || {})
const assignedArea = computed(() => (
  profile.value.assignedArea || profile.value.assigned_area || 'No Area'
))
const rotationNumber = computed(() => profile.value.rotationNumber || '—')
const userInitials = computed(() => props.authSession.displayName
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0].toUpperCase())
  .join('') || 'US')
const formattedShiftDate = computed(() => {
  const [year, month, day] = shiftDate.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(year, month - 1, day))
})
const existingImages = computed(() => {
  const values = submission.value?.receiptImages
    || submission.value?.receiptImage
    || []
  const list = Array.isArray(values) ? values : [values]
  return list.map(normalizeReceiptImageSource).filter(Boolean)
})
const canAddPhotos = computed(() => (
  !submission.value
  && !processing.value
  && !submitting.value
  && photos.value.length < MAX_RECEIPT_PHOTOS
))
const canSubmit = computed(() => (
  !submission.value
  && photos.value.length > 0
  && assignedArea.value !== 'No Area'
  && !processing.value
  && !submitting.value
))

/******************************************************************************/
/* Processing Hierarchy                                                       */
/******************************************************************************/
// loadSubmission    (1.0) Load the active shift receipt.
// openCamera        (2.0) Open the device camera picker.
// openGallery       (3.0) Open the device image picker.
// addFiles          (4.0) Validate and prepare selected photos.
// removePhoto       (5.0) Remove one prepared photo.
// submitReceipt     (6.0) Upload photos and create the daily receipt.
// mapFirebaseError  (7.0) Convert service errors into safe UI messages.
// logout            (8.0) Request termination of the User session.

/**
 * <Layer number> (1.0)
 *
 * <Processing name> loadSubmission
 * <Function> Load the authenticated user's receipt for the active shift.
 *
 * @return {Promise<void>}
 */
async function loadSubmission() {
  loading.value = true
  error.value = ''

  try {
    submission.value = await getUserReceipt(
      props.authSession.user.uid,
      shiftDate,
    )
  } catch (loadError) {
    error.value = mapFirebaseError(loadError)
  } finally {
    loading.value = false
  }
}

/**
 * <Layer number> (2.0)
 *
 * <Processing name> openCamera
 * <Function> Open the device's outward-facing camera when supported.
 *
 * @return {void}
 */
function openCamera() {
  error.value = ''
  cameraInput.value?.click()
}

/**
 * <Layer number> (3.0)
 *
 * <Processing name> openGallery
 * <Function> Open the platform image picker as a camera fallback.
 *
 * @return {void}
 */
function openGallery() {
  error.value = ''
  galleryInput.value?.click()
}

/**
 * <Layer number> (4.0)
 *
 * <Processing name> addFiles
 * <Function> Validate, compress, preview, and stage selected receipt images.
 *
 * @param {Event} event Native file-input change event.
 * @return {Promise<void>}
 */
async function addFiles(event) {
  const input = event.currentTarget
  const availableSlots = MAX_RECEIPT_PHOTOS - photos.value.length
  const selectedFiles = [...(input.files || [])]

  input.value = ''
  error.value = ''
  success.value = ''
  if (selectedFiles.length === 0) return
  if (availableSlots <= 0) {
    error.value = `You can attach up to ${MAX_RECEIPT_PHOTOS} photos.`
    return
  }
  if (selectedFiles.length > availableSlots) {
    error.value = `Only ${availableSlots} more photo${availableSlots === 1 ? '' : 's'} can be added.`
  }

  processing.value = true

  try {
    for (const file of selectedFiles.slice(0, availableSlots)) {
      const blob = await compressReceiptImage(file)
      photos.value.push({
        blob,
        id: crypto.randomUUID(),
        name: file.name || `Receipt ${photos.value.length + 1}`,
        previewUrl: URL.createObjectURL(blob),
      })
    }
  } catch (fileError) {
    error.value = fileError.message || 'One of the images could not be added.'
  } finally {
    processing.value = false
  }
}

/**
 * <Layer number> (5.0)
 *
 * <Processing name> removePhoto
 * <Function> Remove one staged photo and release its preview URL.
 *
 * @param {string} photoId Staged photo identifier.
 * @return {void}
 */
function removePhoto(photoId) {
  const photo = photos.value.find((item) => item.id === photoId)
  if (photo) URL.revokeObjectURL(photo.previewUrl)
  photos.value = photos.value.filter((item) => item.id !== photoId)
  error.value = ''
}

/**
 * <Layer number> (6.0)
 *
 * <Processing name> submitReceipt
 * <Function> Upload staged photos and create the active shift submission.
 *
 * @return {Promise<void>}
 */
async function submitReceipt() {
  if (!canSubmit.value) return

  submitting.value = true
  error.value = ''
  success.value = ''
  uploadProgress.value = 'Preparing secure upload...'

  try {
    const created = await submitUserReceipt({
      session: props.authSession,
      images: photos.value.map((photo) => photo.blob),
      onProgress: (completed, total) => {
        uploadProgress.value = `Uploaded ${completed} of ${total} photos...`
      },
    })

    photos.value.forEach((photo) => URL.revokeObjectURL(photo.previewUrl))
    photos.value = []
    submission.value = created
    success.value = 'Receipt submitted successfully. Your Admin can now review it.'
  } catch (submitError) {
    error.value = mapFirebaseError(submitError)
  } finally {
    uploadProgress.value = ''
    submitting.value = false
  }
}

/**
 * <Layer number> (7.0)
 *
 * <Processing name> mapFirebaseError
 * <Function> Convert Firebase and validation errors into safe UI messages.
 *
 * @param {Error & {code?: string}} sourceError Service or Firebase error.
 * @return {string} User-facing error message.
 */
function mapFirebaseError(sourceError) {
  if (sourceError?.code === 'permission-denied'
    || sourceError?.code === 'storage/unauthorized') {
    return 'Firebase denied this request. Check the account role, active status, and deployed security rules.'
  }
  if (sourceError?.code === 'storage/quota-exceeded') {
    return 'Receipt storage is temporarily unavailable. Contact the SuperAdmin.'
  }
  if (sourceError?.code === 'storage/retry-limit-exceeded') {
    return 'The upload timed out. Check your connection and try again.'
  }

  return sourceError?.message || 'The receipt could not be submitted. Try again.'
}

/**
 * <Layer number> (8.0)
 *
 * <Processing name> logout
 * <Function> Request Firebase logout from the application shell.
 *
 * @return {void}
 */
function logout() {
  emit('logout')
}

onMounted(loadSubmission)

onBeforeUnmount(() => {
  photos.value.forEach((photo) => URL.revokeObjectURL(photo.previewUrl))
})
</script>

<template>
  <div class="user-portal">
    <header class="user-portal__header">
      <div class="user-portal__header-inner">
        <BrandMark />
        <div class="user-profile">
          <span class="user-profile__avatar">{{ userInitials }}</span>
          <span class="user-profile__identity">
            <strong>{{ authSession.displayName }}</strong>
            <small>{{ authSession.user.email }}</small>
          </span>
          <button class="user-portal__logout" type="button" @click="logout">
            <AppIcon name="logout" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>

    <main class="user-receipt">
      <section class="user-receipt__intro" aria-labelledby="receipt-title">
        <div>
          <span class="user-receipt__eyebrow">Daily cleaning proof</span>
          <h1 id="receipt-title">Capture today’s clean.</h1>
          <p>
            Take a clear photo of your completed area. Your submission is
            securely sent to your Admin for monitoring.
          </p>
        </div>
        <div class="shift-ticket" aria-label="Current shift date">
          <span class="shift-ticket__month">Shift record</span>
          <strong>{{ formattedShiftDate }}</strong>
          <small>Resets daily at 8:00 AM</small>
        </div>
      </section>

      <div class="user-receipt__grid">
        <section class="submission-card" aria-labelledby="submission-title">
          <header class="submission-card__header">
            <div>
              <span class="submission-card__step">01 / Receipt proof</span>
              <h2 id="submission-title">
                {{ submission ? 'Submission complete' : 'Add your photos' }}
              </h2>
            </div>
            <span
              class="submission-status"
              :class="submission ? 'submission-status--done' : 'submission-status--pending'"
            >
              <span aria-hidden="true" />
              {{ submission ? 'Submitted' : 'Not submitted' }}
            </span>
          </header>

          <div v-if="loading" class="user-receipt__loading" role="status">
            <span class="dashboard-loading__spinner" aria-hidden="true" />
            <p>Checking today’s submission...</p>
          </div>

          <template v-else-if="submission">
            <div class="submitted-banner" role="status">
              <span class="submitted-banner__icon">
                <AppIcon name="check-circle" />
              </span>
              <div>
                <strong>All done for this shift</strong>
                <p>You can submit again after the next 8:00 AM reset.</p>
              </div>
            </div>

            <div class="receipt-preview-grid receipt-preview-grid--submitted">
              <figure
                v-for="(image, index) in existingImages"
                :key="image"
                class="receipt-preview"
              >
                <img :src="image" :alt="`Submitted receipt ${index + 1}`" />
                <figcaption>Proof {{ String(index + 1).padStart(2, '0') }}</figcaption>
              </figure>
            </div>
          </template>

          <template v-else>
            <div
              v-if="photos.length === 0"
              class="capture-stage"
              :class="{ 'capture-stage--processing': processing }"
            >
              <span class="capture-stage__icon">
                <AppIcon name="camera" />
              </span>
              <h3>{{ processing ? 'Preparing your photo...' : 'No receipt photos yet' }}</h3>
              <p>Use the rear camera for the clearest view of the completed area.</p>
            </div>

            <div v-else class="receipt-preview-grid">
              <figure
                v-for="(photo, index) in photos"
                :key="photo.id"
                class="receipt-preview receipt-preview--staged"
              >
                <img :src="photo.previewUrl" :alt="`Receipt preview ${index + 1}`" />
                <figcaption>Photo {{ String(index + 1).padStart(2, '0') }}</figcaption>
                <button
                  type="button"
                  :aria-label="`Remove receipt photo ${index + 1}`"
                  @click="removePhoto(photo.id)"
                >
                  <AppIcon name="trash" />
                </button>
              </figure>

              <button
                v-if="canAddPhotos"
                class="receipt-preview-add"
                type="button"
                @click="openCamera"
              >
                <AppIcon name="plus" />
                <span>Add photo</span>
              </button>
            </div>

            <div class="capture-actions">
              <button
                class="capture-button capture-button--primary"
                type="button"
                :disabled="!canAddPhotos"
                @click="openCamera"
              >
                <AppIcon name="camera" />
                <span>Open camera</span>
              </button>
              <button
                class="capture-button"
                type="button"
                :disabled="!canAddPhotos"
                @click="openGallery"
              >
                <AppIcon name="image" />
                <span>Choose images</span>
              </button>
            </div>

            <input
              ref="cameraInput"
              class="visually-hidden"
              type="file"
              accept="image/*"
              capture="environment"
              @change="addFiles"
            />
            <input
              ref="galleryInput"
              class="visually-hidden"
              type="file"
              accept="image/*"
              multiple
              @change="addFiles"
            />

            <p class="capture-note">
              <AppIcon name="shield" />
              JPG, PNG, HEIC, or supported image formats. Maximum 3 photos,
              10 MB each before compression.
            </p>
          </template>
        </section>

        <aside class="assignment-card" aria-labelledby="assignment-title">
          <span class="submission-card__step">02 / Assignment</span>
          <h2 id="assignment-title">Today’s details</h2>

          <dl class="assignment-list">
            <div>
              <dt><AppIcon name="location" /> Assigned area</dt>
              <dd>{{ assignedArea }}</dd>
            </div>
            <div>
              <dt><AppIcon name="rotate" /> Rotation</dt>
              <dd>{{ rotationNumber }}</dd>
            </div>
            <div>
              <dt><AppIcon name="calendar" /> Shift date</dt>
              <dd>{{ shiftDate }}</dd>
            </div>
          </dl>

          <p v-if="assignedArea === 'No Area'" class="assignment-warning">
            No cleaning area is assigned to your account. Contact your Admin
            before submitting.
          </p>

          <div class="assignment-card__footer">
            <p v-if="uploadProgress" class="upload-progress" role="status">
              <span class="dashboard-loading__spinner" aria-hidden="true" />
              {{ uploadProgress }}
            </p>
            <p v-if="error" class="user-message user-message--error" role="alert">
              {{ error }}
            </p>
            <p v-if="success" class="user-message user-message--success" role="status">
              {{ success }}
            </p>

            <button
              v-if="!submission"
              class="submit-receipt-button"
              type="button"
              :disabled="!canSubmit"
              @click="submitReceipt"
            >
              <span>{{ submitting ? 'Submitting receipt...' : 'Submit receipt' }}</span>
              <AppIcon name="arrow-right" />
            </button>

            <small v-if="!submission">
              {{ photos.length }} of {{ MAX_RECEIPT_PHOTOS }} photos ready
            </small>
          </div>
        </aside>
      </div>
    </main>
  </div>
</template>
