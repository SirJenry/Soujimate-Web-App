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
const showSubmitConfirmation = ref(false)
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
// requestSubmit     (6.0) Open the receipt submission confirmation.
// closeConfirmation (7.0) Close the receipt submission confirmation.
// submitReceipt     (8.0) Upload photos and create the daily receipt.
// mapFirebaseError  (9.0) Convert service errors into safe UI messages.
// logout           (10.0) Request termination of the User session.

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
 * <Processing name> requestSubmit
 * <Function> Show confirmation before creating the daily receipt.
 *
 * @return {void}
 */
function requestSubmit() {
  if (!canSubmit.value) return

  showSubmitConfirmation.value = true
}

/**
 * <Layer number> (7.0)
 *
 * <Processing name> closeConfirmation
 * <Function> Close the receipt confirmation without saving.
 *
 * @return {void}
 */
function closeConfirmation() {
  if (submitting.value) return

  showSubmitConfirmation.value = false
}

/**
 * <Layer number> (8.0)
 *
 * <Processing name> submitReceipt
 * <Function> Upload staged photos and create the active shift submission.
 *
 * @return {Promise<void>}
 */
async function submitReceipt() {
  if (!canSubmit.value) return

  showSubmitConfirmation.value = false
  submitting.value = true
  error.value = ''
  success.value = ''
  uploadProgress.value = 'Preparing receipt photos...'

  try {
    const created = await submitUserReceipt({
      session: props.authSession,
      images: photos.value.map((photo) => photo.blob),
      onProgress: (message) => {
        uploadProgress.value = message
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
 * <Layer number> (9.0)
 *
 * <Processing name> mapFirebaseError
 * <Function> Convert Firebase and validation errors into safe UI messages.
 *
 * @param {Error & {code?: string}} sourceError Service or Firebase error.
 * @return {string} User-facing error message.
 */
function mapFirebaseError(sourceError) {
  if (sourceError?.code === 'permission-denied') {
    return 'Firebase denied this request. Check the account role, active status, and deployed security rules.'
  }
  if (sourceError?.code === 'resource-exhausted') {
    return 'The receipt is too large for Firestore. Remove one photo and retry.'
  }

  return sourceError?.message || 'The receipt could not be submitted. Try again.'
}

/**
 * <Layer number> (10.0)
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

    <main class="proof-page">
      <section class="proof-hero" aria-labelledby="receipt-title">
        <div class="proof-hero__copy">
          <h1 id="receipt-title">Today’s cleaning proof</h1>
          <p>Add up to three clear photos of your completed area.</p>
          <span
            class="proof-state"
            :class="submission ? 'proof-state--done' : 'proof-state--waiting'"
          >
            <span aria-hidden="true" />
            {{ submission ? 'Submitted' : photos.length ? 'Ready to submit' : 'Awaiting photos' }}
          </span>
        </div>

        <svg
          class="proof-hero__art"
          viewBox="0 0 220 130"
          role="img"
          aria-label="Cleaning checklist and camera"
        >
          <path d="M25 112c0-25 18-38 39-38 8-26 28-39 54-35 22 3 36 19 40 39 25 0 40 13 40 34H25Z" fill="#FFF4D0" />
          <rect x="76" y="19" width="80" height="99" rx="8" fill="#8D96A3" />
          <rect x="84" y="27" width="64" height="82" rx="4" fill="#FFFFFF" />
          <rect x="98" y="12" width="36" height="16" rx="7" fill="#8D96A3" />
          <circle cx="116" cy="17" r="4" fill="#FFFFFF" />
          <rect x="94" y="48" width="13" height="13" rx="2" fill="#F59E0B" />
          <path d="m97 54 3 3 5-7" fill="none" stroke="#fff" stroke-width="2" />
          <rect x="114" y="50" width="25" height="6" rx="3" fill="#F0E8D8" />
          <rect x="94" y="75" width="13" height="13" rx="2" fill="#F59E0B" />
          <path d="m97 81 3 3 5-7" fill="none" stroke="#fff" stroke-width="2" />
          <rect x="114" y="77" width="25" height="6" rx="3" fill="#F0E8D8" />
          <rect x="129" y="72" width="70" height="50" rx="9" fill="#222831" />
          <path d="M142 72l7-10h26l7 10" fill="#222831" />
          <circle cx="164" cy="96" r="15" fill="none" stroke="#FFFFFF" stroke-width="4" />
          <circle cx="164" cy="96" r="6" fill="#8D96A3" />
          <circle cx="187" cy="82" r="3" fill="#FFFFFF" />
          <path d="M42 37v12M36 43h12M181 24v10M176 29h10" stroke="#F59E0B" stroke-width="3" />
        </svg>
      </section>

      <ol class="proof-steps" aria-label="Submission progress">
        <li class="proof-step proof-step--done">
          <span class="proof-step__marker"><AppIcon name="check-circle" /></span>
          <span><strong>Assignment</strong><small>Complete</small></span>
        </li>
        <li
          class="proof-step"
          :class="submission || photos.length ? 'proof-step--done' : 'proof-step--active'"
        >
          <span class="proof-step__marker">2</span>
          <span><strong>Add photos</strong><small>{{ submission || photos.length ? 'Complete' : 'Current step' }}</small></span>
        </li>
        <li
          class="proof-step"
          :class="submission ? 'proof-step--done' : photos.length ? 'proof-step--active' : ''"
        >
          <span class="proof-step__marker">3</span>
          <span><strong>Submit</strong><small>{{ submission ? 'Complete' : photos.length ? 'Current step' : 'Pending' }}</small></span>
        </li>
      </ol>

      <section class="proof-panel proof-assignment" aria-labelledby="assignment-title">
        <header class="proof-panel__header">
          <AppIcon name="location" />
          <h2 id="assignment-title">Today’s assignment</h2>
        </header>
        <dl class="proof-assignment__grid">
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
            <dd>{{ formattedShiftDate }}</dd>
          </div>
          <div>
            <dt><AppIcon name="clock" /> Reset time</dt>
            <dd>8:00 AM</dd>
          </div>
        </dl>
        <p v-if="assignedArea === 'No Area'" class="proof-alert proof-alert--error">
          No cleaning area is assigned. Contact your Admin before submitting.
        </p>
      </section>

      <section class="proof-panel proof-upload" aria-labelledby="upload-title">
        <header class="proof-upload__header">
          <div>
            <h2 id="upload-title">{{ submission ? 'Submitted photos' : 'Upload photos' }}</h2>
            <p v-if="!submission">JPG, PNG, or supported images · 10 MB maximum each</p>
          </div>
          <span>{{ submission ? existingImages.length : photos.length }} / {{ MAX_RECEIPT_PHOTOS }}</span>
        </header>

        <div v-if="loading" class="proof-loading" role="status">
          <span class="dashboard-loading__spinner" aria-hidden="true" />
          Checking today’s submission...
        </div>

        <template v-else-if="submission">
          <div class="proof-success" role="status">
            <AppIcon name="check-circle" />
            <span><strong>Cleaning proof submitted</strong><small>Next submission opens after 8:00 AM.</small></span>
          </div>
          <div class="proof-photo-grid">
            <figure v-for="(image, index) in existingImages" :key="image" class="proof-photo">
              <img :src="image" :alt="`Submitted cleaning proof ${index + 1}`" />
              <figcaption>Photo {{ index + 1 }}</figcaption>
            </figure>
          </div>
        </template>

        <template v-else>
          <div
            class="proof-photo-flow"
            :class="{ 'proof-photo-flow--has-photos': photos.length }"
          >
            <div v-if="photos.length" class="proof-photo-grid">
              <figure
                v-for="(photo, index) in photos"
                :key="photo.id"
                class="proof-photo"
              >
                <img
                  :src="photo.previewUrl"
                  :alt="`Cleaning proof preview ${index + 1}`"
                />
                <figcaption>Photo {{ index + 1 }}</figcaption>
                <button
                  type="button"
                  :aria-label="`Remove photo ${index + 1}`"
                  @click="removePhoto(photo.id)"
                >
                  <AppIcon name="trash" />
                </button>
              </figure>
            </div>

            <div
              v-if="canAddPhotos"
              class="proof-dropzone"
              :class="{ 'proof-dropzone--compact': photos.length }"
            >
              <span class="proof-dropzone__icon">
                <AppIcon name="camera" />
              </span>
              <strong>
                {{
                  processing
                    ? 'Preparing photo...'
                    : photos.length
                      ? 'Add another photo'
                      : 'Add cleaning proof'
                }}
              </strong>
              <div class="proof-dropzone__actions">
                <button type="button" @click="openCamera">
                  <AppIcon name="camera" /> Take photo
                </button>
                <button type="button" @click="openGallery">
                  <AppIcon name="image" /> Choose files
                </button>
              </div>
            </div>
          </div>

          <input ref="cameraInput" class="visually-hidden" type="file" accept="image/*" capture="environment" @change="addFiles" />
          <input ref="galleryInput" class="visually-hidden" type="file" accept="image/*" multiple @change="addFiles" />

          <p v-if="uploadProgress" class="proof-alert" role="status">{{ uploadProgress }}</p>
          <p v-if="error" class="proof-alert proof-alert--error" role="alert">{{ error }}</p>
          <p v-if="success" class="proof-alert proof-alert--success" role="status">{{ success }}</p>
        </template>
      </section>

      <footer v-if="!submission" class="proof-submit-bar">
        <span class="proof-submit-bar__count">
          <AppIcon name="image" />
          <span><strong>{{ photos.length }} {{ photos.length === 1 ? 'photo' : 'photos' }} added</strong><small>Maximum {{ MAX_RECEIPT_PHOTOS }} photos</small></span>
        </span>
        <button type="button" :disabled="!canSubmit" @click="requestSubmit">
          <AppIcon name="arrow-right" />
          {{ submitting ? 'Submitting...' : 'Submit cleaning proof' }}
        </button>
      </footer>
    </main>

    <Teleport to="body">
      <Transition name="proof-confirm">
        <div
          v-if="showSubmitConfirmation"
          class="proof-confirm-overlay"
          role="presentation"
          @click.self="closeConfirmation"
        >
          <section
            class="proof-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="proof-confirm-title"
            aria-describedby="proof-confirm-description"
          >
            <span class="proof-confirm-dialog__icon" aria-hidden="true">
              <AppIcon name="check-circle" />
            </span>
            <h2 id="proof-confirm-title">Submit cleaning proof?</h2>
            <p id="proof-confirm-description">
              Confirm that the selected photos clearly show your completed
              cleaning assignment.
            </p>
            <div class="proof-confirm-dialog__actions">
              <button type="button" @click="closeConfirmation">Cancel</button>
              <button type="button" @click="submitReceipt">
                Yes, submit proof
              </button>
            </div>
          </section>
        </div>
      </Transition>

      <Transition name="proof-saving">
        <div
          v-if="submitting"
          class="proof-saving-overlay"
          role="status"
          aria-live="assertive"
          aria-busy="true"
        >
          <div class="proof-saving-overlay__content">
            <span class="proof-saving-overlay__spinner" aria-hidden="true" />
            <strong>Saving cleaning proof</strong>
            <p>Please keep this page open while your photos are submitted.</p>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
