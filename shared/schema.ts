import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  decimal,
  date,
  time,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Workspaces
export const workspaces = pgTable("workspaces", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'personal' or 'team'
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Workspace members (including AI agents)
export const workspaceMembers = pgTable("workspace_members", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => workspaces.id),
  userId: varchar("user_id"), // null for AI agents
  memberType: varchar("member_type", { length: 20 }).notNull(), // 'user' or 'agent'
  name: varchar("name", { length: 255 }).notNull(), // display name (fallback for AI agents)
  role: varchar("role", { length: 50 }).default("member"), // 'admin', 'manager', 'member', 'viewer', 'agent'
  alias: varchar("alias", { length: 100 }), // for AI agents
  systemPrompt: text("system_prompt"), // for AI agents
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Workspace invitations (for pending user invites)
export const workspaceInvitations = pgTable("workspace_invitations", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => workspaces.id),
  email: varchar("email", { length: 255 }).notNull(),
  invitedBy: varchar("invited_by").notNull().references(() => users.id),
  status: varchar("status", { length: 20 }).default("pending"), // 'pending', 'accepted', 'declined'
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

// Projects
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => workspaces.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 50 }).default("active"), // 'active', 'completed', 'archived'
  budget: decimal("budget", { precision: 10, scale: 2 }),
  spent: decimal("spent", { precision: 10, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Categories
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => workspaces.id),
  name: varchar("name", { length: 255 }).notNull(),
  color: varchar("color", { length: 7 }).default("#6366F1"), // hex color
  createdAt: timestamp("created_at").defaultNow(),
});

// Task recurrences
export const taskRecurrences = pgTable("task_recurrences", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => workspaces.id),
  recurrenceType: varchar("recurrence_type", { length: 20 }).notNull(), // 'daily', 'weekly', 'monthly', 'yearly', 'custom'
  recurrencePattern: jsonb("recurrence_pattern").notNull(), // Flexible pattern storage
  interval: integer("interval").default(1), // e.g., every 2 days, every 3 weeks
  daysOfWeek: varchar("days_of_week", { length: 100 }), // e.g., "monday,wednesday,friday" for full day names
  dayOfMonth: integer("day_of_month"), // e.g., 15 for 15th of each month
  weekOfMonth: integer("week_of_month"), // e.g., 1 for first week, -1 for last week
  monthOfYear: integer("month_of_year"), // e.g., 1 for January, 12 for December
  endType: varchar("end_type", { length: 20 }), // 'never', 'after_count', 'on_date'
  endCount: integer("end_count"), // Number of occurrences
  endDate: date("end_date"), // End date for recurrence
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tasks
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => workspaces.id),
  projectId: integer("project_id").references(() => projects.id),
  categoryId: integer("category_id").references(() => categories.id),
  assignedMemberId: integer("assigned_member_id").references(() => workspaceMembers.id),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 50 }).default("todo"), // 'todo', 'in_progress', 'completed'
  priority: integer("priority").default(0), // 0-3 (0=low, 3=urgent)
  dueDate: date("due_date"),
  dueTime: time("due_time"),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  estimatedHours: decimal("estimated_hours", { precision: 4, scale: 2 }),
  actualHours: decimal("actual_hours", { precision: 4, scale: 2 }),
  timeSlot: varchar("time_slot", { length: 20 }), // e.g., "6:00-9:00"
  agentExecutionLog: text("agent_execution_log"),
  taskRecurrenceId: integer("task_recurrence_id"),
  isRecurringInstance: boolean("is_recurring_instance").default(false),
  originalTaskId: integer("original_task_id"), // References the original task that spawned this recurring instance
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Project pages (documentation)
export const projectPages = pgTable("project_pages", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Brain dump items
export const brainDumpItems = pgTable("brain_dump_items", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => workspaces.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// File vault
export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => workspaces.id),
  projectId: integer("project_id").references(() => projects.id),
  name: varchar("name", { length: 255 }).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  size: integer("size").notNull(),
  path: varchar("path", { length: 500 }).notNull(),
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// AI chat conversations - conversation metadata
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey(), // UUID for conversation identification
  workspaceId: integer("workspace_id").notNull().references(() => workspaces.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: varchar("title", { length: 255 }), // Auto-generated or user-defined conversation title
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// AI chat messages - flexible message system
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id),
  messageType: varchar("message_type", { length: 50 }).notNull(), // system, context, user, ai, tool_call, tool_result
  content: text("content").notNull(),
  metadata: text("metadata"), // JSON string for additional data (tool info, context data, etc.)
  createdAt: timestamp("created_at").defaultNow(),
});

// Legacy chat conversations table (for backward compatibility)
export const chatConversations = pgTable("chat_conversations", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => workspaces.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  conversationId: varchar("conversation_id").notNull(), // UUID for grouping messages
  title: varchar("title", { length: 255 }), // Auto-generated or user-defined conversation title
  message: text("message").notNull(),
  response: text("response"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Project components (milestones/sections)
export const projectComponents = pgTable("project_components", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  workspaceId: integer("workspace_id").notNull().references(() => workspaces.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 50 }).default("milestone"), // milestone, phase, section
  status: varchar("status", { length: 50 }).default("active"), // active, completed, cancelled
  budgetAllocation: decimal("budget_allocation", { precision: 12, scale: 2 }),
  startDate: date("start_date"),
  endDate: date("end_date"),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Inflow Types (Revenue Categories)
export const inflowTypes = pgTable("inflow_types", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  workspaceId: integer("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Outflow Types (Expense Categories)
export const outflowTypes = pgTable("outflow_types", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  workspaceId: integer("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Project budgets
export const projectBudgets = pgTable("project_budgets", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  workspaceId: integer("workspace_id").notNull().references(() => workspaces.id),
  componentId: integer("component_id").references(() => projectComponents.id),
  budgetAmount: decimal("budget_amount", { precision: 12, scale: 2 }).notNull(),
  spentAmount: decimal("spent_amount", { precision: 12, scale: 2 }).default("0"),
  period: varchar("period", { length: 50 }).default("monthly"), // monthly, quarterly, yearly
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Project outflows (formerly expenses)
export const projectOutflows = pgTable("project_outflows", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  workspaceId: integer("workspace_id").notNull().references(() => workspaces.id),
  componentId: integer("component_id").references(() => projectComponents.id),
  budgetId: integer("budget_id").references(() => projectBudgets.id),
  outflowTypeId: integer("outflow_type_id").notNull().references(() => outflowTypes.id, { onDelete: "restrict" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  date: date("date").notNull(),
  receipt: varchar("receipt", { length: 500 }), // file path or URL
  status: varchar("status", { length: 50 }).default("pending"), // pending, approved, rejected
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Project inflows (formerly revenue)
export const projectInflows = pgTable("project_inflows", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  workspaceId: integer("workspace_id").notNull().references(() => workspaces.id),
  componentId: integer("component_id").references(() => projectComponents.id),
  inflowTypeId: integer("inflow_type_id").notNull().references(() => inflowTypes.id, { onDelete: "restrict" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  date: date("date").notNull(),
  status: varchar("status", { length: 50 }).default("pending"), // pending, received
  invoiceNumber: varchar("invoice_number", { length: 100 }),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Keep legacy tables for backward compatibility
export const projectExpenses = projectOutflows;
export const projectRevenue = projectInflows;

// Notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => workspaces.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: varchar("type", { length: 50 }).notNull(), // 'task_assigned', 'task_completed', 'comment_added'
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  taskId: integer("task_id").references(() => tasks.id),
  commentId: integer("comment_id"),
  isRead: boolean("is_read").default(false),
  emailSent: boolean("email_sent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Task comments
export const taskComments = pgTable("task_comments", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  workspaceId: integer("workspace_id").notNull().references(() => workspaces.id),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  ownedWorkspaces: many(workspaces),
  brainDumpItems: many(brainDumpItems),
  uploadedFiles: many(files),
  chatConversations: many(chatConversations),
  conversations: many(conversations),
}));

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(users, {
    fields: [workspaces.ownerId],
    references: [users.id],
  }),
  members: many(workspaceMembers),
  projects: many(projects),
  categories: many(categories),
  tasks: many(tasks),
  brainDumpItems: many(brainDumpItems),
  files: many(files),
  chatConversations: many(chatConversations),
  conversations: many(conversations),
}));

export const workspaceInvitationsRelations = relations(workspaceInvitations, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceInvitations.workspaceId],
    references: [workspaces.id],
  }),
  invitedBy: one(users, {
    fields: [workspaceInvitations.invitedBy],
    references: [users.id],
  }),
}));

export const workspaceMembersRelations = relations(workspaceMembers, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [workspaceMembers.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [workspaceMembers.userId],
    references: [users.id],
  }),
  assignedTasks: many(tasks),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [projects.workspaceId],
    references: [workspaces.id],
  }),
  tasks: many(tasks),
  pages: many(projectPages),
  files: many(files),
  components: many(projectComponents),
  budgets: many(projectBudgets),
  expenses: many(projectExpenses),
  revenue: many(projectRevenue),
}));

export const inflowTypesRelations = relations(inflowTypes, ({ one, many }) => ({
  project: one(projects, {
    fields: [inflowTypes.projectId],
    references: [projects.id],
  }),
  workspace: one(workspaces, {
    fields: [inflowTypes.workspaceId],
    references: [workspaces.id],
  }),
  inflows: many(projectInflows),
}));

export const outflowTypesRelations = relations(outflowTypes, ({ one, many }) => ({
  project: one(projects, {
    fields: [outflowTypes.projectId],
    references: [projects.id],
  }),
  workspace: one(workspaces, {
    fields: [outflowTypes.workspaceId],
    references: [workspaces.id],
  }),
  outflows: many(projectOutflows),
}));

export const projectComponentsRelations = relations(projectComponents, ({ one, many }) => ({
  project: one(projects, {
    fields: [projectComponents.projectId],
    references: [projects.id],
  }),
  workspace: one(workspaces, {
    fields: [projectComponents.workspaceId],
    references: [workspaces.id],
  }),
  budgets: many(projectBudgets),
  expenses: many(projectExpenses),
  revenue: many(projectRevenue),
  outflows: many(projectOutflows),
  inflows: many(projectInflows),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [categories.workspaceId],
    references: [workspaces.id],
  }),
  tasks: many(tasks),
}));

export const taskRecurrencesRelations = relations(taskRecurrences, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [taskRecurrences.workspaceId],
    references: [workspaces.id],
  }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [tasks.workspaceId],
    references: [workspaces.id],
  }),
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  category: one(categories, {
    fields: [tasks.categoryId],
    references: [categories.id],
  }),
  assignedMember: one(workspaceMembers, {
    fields: [tasks.assignedMemberId],
    references: [workspaceMembers.id],
  }),
  taskRecurrence: one(taskRecurrences, {
    fields: [tasks.taskRecurrenceId],
    references: [taskRecurrences.id],
  }),
}));

export const projectPagesRelations = relations(projectPages, ({ one }) => ({
  project: one(projects, {
    fields: [projectPages.projectId],
    references: [projects.id],
  }),
}));

export const brainDumpItemsRelations = relations(brainDumpItems, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [brainDumpItems.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [brainDumpItems.userId],
    references: [users.id],
  }),
}));

export const filesRelations = relations(files, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [files.workspaceId],
    references: [workspaces.id],
  }),
  project: one(projects, {
    fields: [files.projectId],
    references: [projects.id],
  }),
  uploader: one(users, {
    fields: [files.uploadedBy],
    references: [users.id],
  }),
}));

export const chatConversationsRelations = relations(chatConversations, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [chatConversations.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [chatConversations.userId],
    references: [users.id],
  }),
}));

// New conversation and message relations
export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [conversations.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [chatMessages.conversationId],
    references: [conversations.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [notifications.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  task: one(tasks, {
    fields: [notifications.taskId],
    references: [tasks.id],
  }),
}));

export const taskCommentsRelations = relations(taskComments, ({ one }) => ({
  task: one(tasks, {
    fields: [taskComments.taskId],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [taskComments.userId],
    references: [users.id],
  }),
  workspace: one(workspaces, {
    fields: [taskComments.workspaceId],
    references: [workspaces.id],
  }),
}));

export const projectBudgetsRelations = relations(projectBudgets, ({ one }) => ({
  project: one(projects, {
    fields: [projectBudgets.projectId],
    references: [projects.id],
  }),
  workspace: one(workspaces, {
    fields: [projectBudgets.workspaceId],
    references: [workspaces.id],
  }),
  component: one(projectComponents, {
    fields: [projectBudgets.componentId],
    references: [projectComponents.id],
  }),
}));

export const projectOutflowsRelations = relations(projectOutflows, ({ one }) => ({
  project: one(projects, {
    fields: [projectOutflows.projectId],
    references: [projects.id],
  }),
  workspace: one(workspaces, {
    fields: [projectOutflows.workspaceId],
    references: [workspaces.id],
  }),
  component: one(projectComponents, {
    fields: [projectOutflows.componentId],
    references: [projectComponents.id],
  }),
  budget: one(projectBudgets, {
    fields: [projectOutflows.budgetId],
    references: [projectBudgets.id],
  }),
  outflowType: one(outflowTypes, {
    fields: [projectOutflows.outflowTypeId],
    references: [outflowTypes.id],
  }),
  creator: one(users, {
    fields: [projectOutflows.createdBy],
    references: [users.id],
  }),
}));

export const projectInflowsRelations = relations(projectInflows, ({ one }) => ({
  project: one(projects, {
    fields: [projectInflows.projectId],
    references: [projects.id],
  }),
  workspace: one(workspaces, {
    fields: [projectInflows.workspaceId],
    references: [workspaces.id],
  }),
  component: one(projectComponents, {
    fields: [projectInflows.componentId],
    references: [projectComponents.id],
  }),
  inflowType: one(inflowTypes, {
    fields: [projectInflows.inflowTypeId],
    references: [inflowTypes.id],
  }),
  creator: one(users, {
    fields: [projectInflows.createdBy],
    references: [users.id],
  }),
}));

// Legacy relations for backward compatibility
export const projectExpensesRelations = projectOutflowsRelations;
export const projectRevenueRelations = projectInflowsRelations;

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ createdAt: true, updatedAt: true });
export const insertWorkspaceSchema = createInsertSchema(workspaces).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWorkspaceMemberSchema = createInsertSchema(workspaceMembers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true, createdAt: true });
export const insertTaskRecurrenceSchema = createInsertSchema(taskRecurrences).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProjectPageSchema = createInsertSchema(projectPages).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBrainDumpItemSchema = createInsertSchema(brainDumpItems).omit({ id: true, createdAt: true });
export const insertFileSchema = createInsertSchema(files).omit({ id: true, createdAt: true });
export const insertChatConversationSchema = createInsertSchema(chatConversations).omit({ id: true, createdAt: true });
export const insertConversationSchema = createInsertSchema(conversations).omit({ createdAt: true, updatedAt: true });
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, createdAt: true });
export const insertWorkspaceInvitationSchema = createInsertSchema(workspaceInvitations).omit({ id: true, createdAt: true, expiresAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const insertTaskCommentSchema = createInsertSchema(taskComments).omit({ id: true, createdAt: true });
export const insertProjectComponentSchema = createInsertSchema(projectComponents).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProjectBudgetSchema = createInsertSchema(projectBudgets).omit({ id: true, createdAt: true, updatedAt: true });
export const insertInflowTypeSchema = createInsertSchema(inflowTypes).omit({ id: true, createdAt: true });
export const insertOutflowTypeSchema = createInsertSchema(outflowTypes).omit({ id: true, createdAt: true });
export const insertProjectInflowSchema = createInsertSchema(projectInflows).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProjectOutflowSchema = createInsertSchema(projectOutflows).omit({ id: true, createdAt: true, updatedAt: true });
// Legacy schemas for backward compatibility
export const insertProjectExpenseSchema = insertProjectOutflowSchema;
export const insertProjectRevenueSchema = insertProjectInflowSchema;

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertWorkspace = z.infer<typeof insertWorkspaceSchema>;
export type Workspace = typeof workspaces.$inferSelect;
export type InsertWorkspaceMember = z.infer<typeof insertWorkspaceMemberSchema>;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect & {
  email?: string | null; // computed from user relation
};
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;
export type InsertTaskRecurrence = z.infer<typeof insertTaskRecurrenceSchema>;
export type TaskRecurrence = typeof taskRecurrences.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertProjectPage = z.infer<typeof insertProjectPageSchema>;
export type ProjectPage = typeof projectPages.$inferSelect;
export type InsertBrainDumpItem = z.infer<typeof insertBrainDumpItemSchema>;
export type BrainDumpItem = typeof brainDumpItems.$inferSelect;
export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof files.$inferSelect;
export type InsertChatConversation = z.infer<typeof insertChatConversationSchema>;
export type ChatConversation = typeof chatConversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertWorkspaceInvitation = z.infer<typeof insertWorkspaceInvitationSchema>;
export type WorkspaceInvitation = typeof workspaceInvitations.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertTaskComment = z.infer<typeof insertTaskCommentSchema>;
export type TaskComment = typeof taskComments.$inferSelect & {
  userName?: string; // computed from user relation
};
export type InsertProjectComponent = z.infer<typeof insertProjectComponentSchema>;
export type ProjectComponent = typeof projectComponents.$inferSelect;
export type InsertProjectBudget = z.infer<typeof insertProjectBudgetSchema>;
export type ProjectBudget = typeof projectBudgets.$inferSelect;
export type InsertInflowType = z.infer<typeof insertInflowTypeSchema>;
export type InflowType = typeof inflowTypes.$inferSelect;
export type InsertOutflowType = z.infer<typeof insertOutflowTypeSchema>;
export type OutflowType = typeof outflowTypes.$inferSelect;
export type InsertProjectInflow = z.infer<typeof insertProjectInflowSchema>;
export type ProjectInflow = typeof projectInflows.$inferSelect;
export type InsertProjectOutflow = z.infer<typeof insertProjectOutflowSchema>;
export type ProjectOutflow = typeof projectOutflows.$inferSelect;
// Legacy types for backward compatibility
export type InsertProjectExpense = InsertProjectOutflow;
export type ProjectExpense = ProjectOutflow;
export type InsertProjectRevenue = InsertProjectInflow;
export type ProjectRevenue = ProjectInflow;

// Activity Tracking
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  workspaceId: integer("workspace_id").references(() => workspaces.id),
  action: varchar("action", { length: 100 }).notNull(), // 'created', 'updated', 'deleted', 'viewed', 'commented', etc.
  entityType: varchar("entity_type", { length: 50 }).notNull(), // 'task', 'project', 'workspace', 'comment', 'file', etc.
  entityId: integer("entity_id"), // ID of the entity being acted upon
  entityName: varchar("entity_name", { length: 255 }), // Name/title of the entity for context
  details: jsonb("details"), // Additional context data (old values, new values, etc.)
  metadata: jsonb("metadata"), // Extra metadata (IP, user agent, etc.)
  createdAt: timestamp("created_at").defaultNow(),
});

// Activity logs relations
export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
  workspace: one(workspaces, {
    fields: [activityLogs.workspaceId],
    references: [workspaces.id],
  }),
}));

// Activity logs schema
export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;


