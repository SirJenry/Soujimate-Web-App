<script setup>
import { computed, ref } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  search: { type: String, default: '' },
  status: { type: String, default: 'All' },
  date: { type: String, required: true },
  division: { type: String, default: '' },
  area: { type: String, default: '' },
  divisionOptions: { type: Array, default: () => [] },
  areaOptions: { type: Array, default: () => [] },
  showDivision: { type: Boolean, default: true },
})

defineEmits([
  'update:area',
  'update:date',
  'update:division',
  'update:search',
  'update:status',
])

const statuses = ['All', 'Submitted', 'Missing']
const dateInput = ref(null)
const currentDate = new Date()
const today = [
  currentDate.getFullYear(),
  String(currentDate.getMonth() + 1).padStart(2, '0'),
  String(currentDate.getDate()).padStart(2, '0'),
].join('-')

const selectedDateLabel = computed(() => {
  const [year, month, day] = props.date.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    ...(props.date === today ? {} : { year: 'numeric' }),
    timeZone: 'UTC',
  }).format(date)

  return props.date === today ? `Today, ${formattedDate}` : formattedDate
})

/**
 * <Layer number> (1.0)
 *
 * <Processing name> openDatePicker
 * <Function> Open the native date picker from the full date control.
 *
 * @return {void}
 */
function openDatePicker() {
  if (typeof dateInput.value?.showPicker === 'function') {
    dateInput.value.showPicker()
    return
  }

  dateInput.value?.focus()
}
</script>

<template>
  <section class="filter-bar" aria-label="Submission filters">
    <label
      class="filter-control date-control"
      role="button"
      tabindex="0"
      @click="openDatePicker"
      @keydown.enter.prevent="openDatePicker"
      @keydown.space.prevent="openDatePicker"
    >
      <AppIcon name="calendar" />
      <span>{{ selectedDateLabel }}</span>
      <AppIcon name="chevron-down" />
      <input
        ref="dateInput"
        :value="date"
        class="date-control__input"
        type="date"
        tabindex="-1"
        aria-label="Filter by date"
        @input="$emit('update:date', $event.target.value)"
      />
    </label>

    <label v-if="showDivision" class="select-shell">
      <select
        :value="division"
        class="filter-control filter-select"
        aria-label="Filter by division"
        @change="$emit('update:division', $event.target.value)"
      >
        <option value="">All Divisions</option>
        <option v-for="option in divisionOptions" :key="option" :value="option">
          {{ option }}
        </option>
      </select>
      <AppIcon name="chevron-down" />
    </label>

    <label class="select-shell">
      <select
        :value="area"
        class="filter-control filter-select"
        aria-label="Filter by area"
        @change="$emit('update:area', $event.target.value)"
      >
        <option value="">All Areas</option>
        <option v-for="option in areaOptions" :key="option" :value="option">
          {{ option }}
        </option>
      </select>
      <AppIcon name="chevron-down" />
    </label>

    <div class="status-segment" aria-label="Filter by submission status">
      <button
        v-for="option in statuses"
        :key="option"
        type="button"
        :aria-pressed="status === option"
        @click="$emit('update:status', option)"
      >
        {{ option }}
      </button>
    </div>

    <label class="filter-search">
      <AppIcon name="search" />
      <input
        :value="search"
        type="search"
        placeholder="Search by name..."
        aria-label="Search employees by name or email"
        @input="$emit('update:search', $event.target.value)"
      />
    </label>
  </section>
</template>
