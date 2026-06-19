<script setup>
import AppIcon from './AppIcon.vue'

defineProps({
  rows: { type: Array, required: true },
  title: { type: String, default: 'Main Submission Log' },
  showEmail: { type: Boolean, default: true },
  showExport: { type: Boolean, default: true },
})

const emit = defineEmits(['select-employee'])

function handleRowClick(employee) {
  emit('select-employee', employee)
}
</script>

<template>
  <section class="panel-card" aria-labelledby="submission-log-title">
    <header class="panel-card__header">
      <h2 id="submission-log-title" class="panel-card__title">{{ title }}</h2>
      <button
        v-if="showExport"
        class="export-button"
        type="button"
        title="CSV export will be connected later"
      >
        <span>Export CSV</span>
        <AppIcon name="download" />
      </button>
    </header>

    <div class="table-scroll">
      <table class="submission-table">
        <thead>
          <tr>
            <th scope="col">Employee Name</th>
            <th scope="col">Assigned Area</th>
            <th scope="col">Task</th>
            <th scope="col">Status</th>
            <th scope="col">Time</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="rows.length === 0">
            <td class="empty-state" colspan="5">No employees match these filters.</td>
          </tr>
          <tr v-for="employee in rows" :key="employee.id" class="submission-row" :class="{ 'is-missing': employee.status === 'Missing' }" @click="handleRowClick(employee)">
            <td>
              <div class="employee-cell">
                <span class="employee-avatar">{{ employee.initials }}</span>
                <span style="min-width: 0">
                  <span class="employee-name">{{ employee.name }}</span>
                  <span v-if="showEmail" class="employee-email">
                    {{ employee.email }}
                  </span>
                </span>
              </div>
            </td>
            <td>{{ employee.area }}</td>
            <td>{{ employee.task }}</td>
            <td>
              <span class="status-badge" :class="`status-badge--${employee.status.toLowerCase()}`">
                <AppIcon :name="employee.status === 'Submitted' ? 'check-circle' : 'alert'" />
                {{ employee.status }}
              </span>
            </td>
            <td>{{ employee.time }}</td>
          </tr>
        </tbody>
      </table>
    </div>

  </section>
</template>
