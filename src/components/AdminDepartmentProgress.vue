<script setup>
import { computed } from 'vue'

const props = defineProps({
  completed: { type: Number, required: true },
  department: { type: String, required: true },
  total: { type: Number, required: true },
})

/******************************************************************************/
/* Processing Hierarchy                                                       */
/******************************************************************************/
// getProgressNote (1.0) Describe the current department progress.

const progressNote = computed(getProgressNote)

/**
 * <Layer number> (1.0)
 *
 * <Processing name> getProgressNote
 * <Function> Describe progress using the live completion ratio.
 *
 * @return {string} Department progress message.
 */
function getProgressNote() {
  if (props.total === 0) return 'No active employees are assigned.'
  if (props.completed === props.total) return 'Today’s cleaning goal is complete.'
  if (props.completed === 0) return 'No submissions have been recorded yet.'
  if (props.completed / props.total >= 0.5) {
    return 'Currently on track for shift completion.'
  }

  return 'Follow-up may be needed to complete today’s goal.'
}
</script>

<template>
  <section class="side-card admin-progress" aria-labelledby="admin-progress-title">
    <div class="admin-card-heading">
      <span class="admin-card-kicker">Daily pulse</span>
      <h2 id="admin-progress-title" class="side-card__title">
        {{ department }} Progress
      </h2>
    </div>

    <div class="admin-progress__summary">
      <span>Today's goal</span>
      <strong>{{ completed }}/{{ total }} submitted</strong>
    </div>
    <div
      class="progress-track"
      role="progressbar"
      :aria-valuenow="completed"
      aria-valuemin="0"
      :aria-valuemax="total"
      :aria-label="`${department} submission progress`"
    >
      <div
        class="progress-fill progress-fill--amber"
        :style="{ width: `${total ? (completed / total) * 100 : 0}%` }"
      />
    </div>
    <p class="admin-progress__note">
      {{ progressNote }}
    </p>
  </section>
</template>
