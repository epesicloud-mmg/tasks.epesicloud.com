import { addDays, addWeeks, addMonths, addYears, format, parseISO, isBefore } from "date-fns";

export interface RecurrenceConfig {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  interval: number;
  endType: 'never' | 'after_count' | 'on_date';
  endCount?: number;
  endDate?: string;
  weeklyDays?: number[]; // 0-6 for Sun-Sat
  monthlyOption?: 'date' | 'day'; // specific date or relative day
}

export interface TaskRecurrenceData {
  title: string;
  description?: string;
  projectId?: number;
  categoryId?: number;
  assignedMemberId?: number;
  priority: number;
  status: string;
  timeSlot?: string;
  workspaceId: number;
}

export function generateRecurringTasks(
  baseTask: TaskRecurrenceData,
  startDate: Date,
  config: RecurrenceConfig,
  maxInstances: number = 50
): Array<TaskRecurrenceData & { dueDate: string }> {
  const tasks: Array<TaskRecurrenceData & { dueDate: string }> = [];
  let currentDate = new Date(startDate);
  let instanceCount = 0;

  // Generate first task (original)
  tasks.push({
    ...baseTask,
    dueDate: format(currentDate, 'yyyy-MM-dd'),
  });
  instanceCount++;

  // Check end conditions
  const shouldContinue = (date: Date, count: number): boolean => {
    if (count >= maxInstances) return false;
    
    switch (config.endType) {
      case 'never':
        return true;
      case 'after_count':
        return config.endCount ? count < config.endCount : false;
      case 'on_date':
        return config.endDate ? isBefore(date, parseISO(config.endDate)) : false;
      default:
        return false;
    }
  };

  // Generate recurring instances
  while (shouldContinue(currentDate, instanceCount)) {
    currentDate = calculateNextDate(currentDate, config);
    
    if (!shouldContinue(currentDate, instanceCount + 1)) break;

    // For weekly recurrence with specific days
    if (config.type === 'weekly' && config.weeklyDays && config.weeklyDays.length > 0) {
      const weeklyTasks = generateWeeklyTasks(baseTask, currentDate, config.weeklyDays, config.interval);
      tasks.push(...weeklyTasks.filter(task => shouldContinue(parseISO(task.dueDate), instanceCount + 1)));
      instanceCount += weeklyTasks.length;
    } else {
      tasks.push({
        ...baseTask,
        dueDate: format(currentDate, 'yyyy-MM-dd'),
      });
      instanceCount++;
    }
  }

  return tasks.slice(0, maxInstances);
}

function calculateNextDate(currentDate: Date, config: RecurrenceConfig): Date {
  switch (config.type) {
    case 'daily':
      return addDays(currentDate, config.interval);
    case 'weekly':
      return addWeeks(currentDate, config.interval);
    case 'monthly':
      return addMonths(currentDate, config.interval);
    case 'yearly':
      return addYears(currentDate, config.interval);
    case 'custom':
      return addDays(currentDate, config.interval);
    default:
      return addDays(currentDate, 1);
  }
}

function generateWeeklyTasks(
  baseTask: TaskRecurrenceData,
  weekStart: Date,
  weeklyDays: number[],
  interval: number
): Array<TaskRecurrenceData & { dueDate: string }> {
  const tasks: Array<TaskRecurrenceData & { dueDate: string }> = [];
  
  // Find the start of the week (Sunday = 0)
  const startOfWeek = new Date(weekStart);
  startOfWeek.setDate(weekStart.getDate() - weekStart.getDay());
  
  // Generate tasks for each selected day of the week
  weeklyDays.forEach(dayOfWeek => {
    const taskDate = new Date(startOfWeek);
    taskDate.setDate(startOfWeek.getDate() + dayOfWeek);
    
    tasks.push({
      ...baseTask,
      dueDate: format(taskDate, 'yyyy-MM-dd'),
    });
  });
  
  return tasks;
}

export function createRecurrenceFromFormData(formData: any): RecurrenceConfig | null {
  if (!formData.hasRecurrence) return null;
  
  return {
    type: formData.recurrenceType || 'daily',
    interval: formData.recurrenceInterval || 1,
    endType: formData.recurrenceEndType || 'never',
    endCount: formData.recurrenceEndCount,
    endDate: formData.recurrenceEndDate,
    weeklyDays: formData.weeklyDays,
    monthlyOption: formData.monthlyOption,
  };
}