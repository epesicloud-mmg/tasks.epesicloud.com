const fs = require('fs');

// Load the JSON data
const data = JSON.parse(fs.readFileSync('attached_assets/neon_export (1)_1756809527990.json', 'utf8'));
const tasks = data.tasks;

// List of already imported task IDs (update this as we import more)
const imported = [29, 41, 44, 229, 58, 241, 238, 240, 244, 246, 381, 249, 382, 383, 309, 310, 251, 384, 250, 385, 386, 315, 231, 236, 320, 72, 325, 311, 326, 312, 70, 71, 327, 237, 387, 239, 329, 744, 745, 746, 747, 388, 389, 390, 391, 392, 393, 9, 18, 45];

// Get remaining tasks
const remaining = tasks.filter(t => !imported.includes(t.id));
console.log(`Remaining tasks: ${remaining.length}`);

// Helper functions for SQL generation
function escapeString(str) {
  if (!str) return 'null';
  return "'" + str.replace(/'/g, "''").replace(/\n/g, '\\n') + "'";
}

function formatValue(val) {
  if (val === null || val === undefined || val === '') return 'null';
  if (typeof val === 'string') return escapeString(val);
  if (typeof val === 'number') return val.toString();
  if (typeof val === 'boolean') return val.toString();
  return escapeString(val.toString());
}

// Process tasks in batches of 30
const batchSize = 30;
const totalBatches = Math.ceil(remaining.length / batchSize);

for (let i = 0; i < totalBatches; i++) {
  const batch = remaining.slice(i * batchSize, (i + 1) * batchSize);
  
  console.log(`\n-- Batch ${i + 1} of ${totalBatches} (${batch.length} tasks)`);
  console.log('INSERT INTO tasks (id, workspace_id, project_id, category_id, assigned_member_id, title, description, status, priority, due_date, due_time, start_time, end_time, estimated_hours, actual_hours, time_slot, agent_execution_log, task_recurrence_id, is_recurring_instance, original_task_id, created_at, updated_at) VALUES');

  const values = batch.map(task => {
    return `(${task.id}, ${task.workspace_id}, ${formatValue(task.project_id)}, ${formatValue(task.category_id)}, ${formatValue(task.assigned_member_id)}, ${escapeString(task.title)}, ${escapeString(task.description)}, ${escapeString(task.status)}, ${task.priority}, ${formatValue(task.due_date ? task.due_date.split('T')[0] : null)}, ${formatValue(task.due_time)}, ${formatValue(task.start_time)}, ${formatValue(task.end_time)}, ${formatValue(task.estimated_hours)}, ${formatValue(task.actual_hours)}, ${escapeString(task.time_slot)}, ${formatValue(task.agent_execution_log)}, ${formatValue(task.task_recurrence_id)}, ${task.is_recurring_instance}, ${formatValue(task.original_task_id)}, '${task.created_at}', '${task.updated_at}')`;
  }).join(',\n');

  console.log(values);
  console.log(' ON CONFLICT (id) DO UPDATE SET workspace_id = EXCLUDED.workspace_id, project_id = EXCLUDED.project_id, category_id = EXCLUDED.category_id, assigned_member_id = EXCLUDED.assigned_member_id, title = EXCLUDED.title, description = EXCLUDED.description, status = EXCLUDED.status, priority = EXCLUDED.priority, due_date = EXCLUDED.due_date, due_time = EXCLUDED.due_time, start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time, estimated_hours = EXCLUDED.estimated_hours, actual_hours = EXCLUDED.actual_hours, time_slot = EXCLUDED.time_slot, agent_execution_log = EXCLUDED.agent_execution_log, task_recurrence_id = EXCLUDED.task_recurrence_id, is_recurring_instance = EXCLUDED.is_recurring_instance, original_task_id = EXCLUDED.original_task_id, updated_at = EXCLUDED.updated_at;');
  
  if (i < totalBatches - 1) {
    console.log('\n---SPLIT---');
  }
}