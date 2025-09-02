import {
  users,
  workspaces,
  workspaceMembers,
  workspaceInvitations,
  projects,
  categories,
  tasks,
  taskRecurrences,
  projectPages,
  brainDumpItems,
  files,
  chatConversations,
  notifications,
  taskComments,
  projectComponents,
  projectBudgets,
  projectExpenses,
  projectRevenue,
  inflowTypes,
  outflowTypes,
  projectInflows,
  projectOutflows,
  activityLogs,

  type User,
  type UpsertUser,
  type Workspace,
  type InsertWorkspace,
  type WorkspaceMember,
  type InsertWorkspaceMember,
  type Project,
  type InsertProject,
  type Category,
  type InsertCategory,
  type Task,
  type InsertTask,
  type TaskRecurrence,
  type InsertTaskRecurrence,
  type ProjectPage,
  type InsertProjectPage,
  type BrainDumpItem,
  type InsertBrainDumpItem,
  type File,
  type InsertFile,
  type ChatConversation,
  type InsertChatConversation,
  type WorkspaceInvitation,
  type InsertWorkspaceInvitation,
  type Notification,
  type InsertNotification,
  type TaskComment,
  type InsertTaskComment,
  type ProjectComponent,
  type InsertProjectComponent,
  type ProjectBudget,
  type InsertProjectBudget,
  type ProjectExpense,
  type InsertProjectExpense,
  type ProjectRevenue,
  type InsertProjectRevenue,
  type InflowType,
  type InsertInflowType,
  type OutflowType,
  type InsertOutflowType,
  type ProjectInflow,
  type InsertProjectInflow,
  type ProjectOutflow,
  type InsertProjectOutflow,
  type ActivityLog,
  type InsertActivityLog,

} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, gte, lte, count, sql, not } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  ensureUserSetup(userId: string): Promise<{ workspace: Workspace; project: Project }>;

  // Workspace operations
  getUserWorkspaces(userId: string): Promise<Workspace[]>;
  getWorkspaceById(id: number): Promise<Workspace | undefined>;
  createWorkspace(workspace: InsertWorkspace): Promise<Workspace>;
  getWorkspaceMembers(workspaceId: number): Promise<WorkspaceMember[]>;
  addWorkspaceMember(member: InsertWorkspaceMember): Promise<WorkspaceMember>;
  updateWorkspaceMember(id: number, updates: Partial<InsertWorkspaceMember>): Promise<WorkspaceMember>;
  removeWorkspaceMember(id: number): Promise<void>;

  // Project operations
  getWorkspaceProjects(workspaceId: number): Promise<Project[]>;
  getProjectById(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, updates: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: number): Promise<void>;

  // Category operations
  getWorkspaceCategories(workspaceId: number): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, updates: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: number): Promise<void>;

  // Task operations
  getWorkspaceTasks(workspaceId: number): Promise<Task[]>;
  getProjectTasks(projectId: number): Promise<Task[]>;
  getUserTasks(userId: string, workspaceId: number): Promise<Task[]>;
  getTaskById(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, updates: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: number): Promise<void>;
  getDueTodayTasks(workspaceId: number): Promise<Task[]>;

  // Project pages operations
  getProjectPages(projectId: number): Promise<ProjectPage[]>;
  createProjectPage(page: InsertProjectPage): Promise<ProjectPage>;
  updateProjectPage(id: number, updates: Partial<InsertProjectPage>): Promise<ProjectPage>;
  deleteProjectPage(id: number): Promise<void>;

  // Brain dump operations
  getUserBrainDumpItems(workspaceId: number, userId: string): Promise<BrainDumpItem[]>;
  createBrainDumpItem(item: InsertBrainDumpItem): Promise<BrainDumpItem>;
  deleteBrainDumpItem(id: number): Promise<void>;
  clearUserBrainDump(workspaceId: number, userId: string): Promise<void>;

  // File operations
  getWorkspaceFiles(workspaceId: number): Promise<File[]>;
  getProjectFiles(projectId: number): Promise<File[]>;
  createFile(file: InsertFile): Promise<File>;
  updateFile(id: number, updates: Partial<InsertFile>): Promise<File>;
  deleteFile(id: number): Promise<void>;

  // Chat operations
  getWorkspaceChatHistory(workspaceId: number, limit?: number): Promise<ChatConversation[]>;
  createChatConversation(conversation: InsertChatConversation): Promise<ChatConversation>;

  // Invitation operations
  createWorkspaceInvitation(invitation: InsertWorkspaceInvitation): Promise<WorkspaceInvitation>;
  getWorkspaceInvitations(workspaceId: number): Promise<WorkspaceInvitation[]>;
  getInvitationById(id: number): Promise<WorkspaceInvitation | undefined>;
  getPendingInvitations(email: string): Promise<WorkspaceInvitation[]>;
  acceptInvitation(invitationId: number, userId: string): Promise<void>;

  // Notification operations
  getUserNotifications(userId: string, workspaceId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<void>;
  markAllNotificationsAsRead(userId: string, workspaceId: number): Promise<void>;
  getUnreadNotificationCount(userId: string, workspaceId: number): Promise<number>;

  // Task comment operations
  getTaskComments(taskId: number): Promise<TaskComment[]>;
  createTaskComment(comment: InsertTaskComment): Promise<TaskComment>;
  deleteTaskComment(id: number): Promise<void>;

  // Task recurrence operations
  createTaskRecurrence(recurrence: InsertTaskRecurrence): Promise<TaskRecurrence>;
  getTaskRecurrence(id: number): Promise<TaskRecurrence | undefined>;
  updateTaskRecurrence(id: number, updates: Partial<InsertTaskRecurrence>): Promise<TaskRecurrence>;
  deleteTaskRecurrence(id: number): Promise<void>;
  deleteRecurringTaskInstances(recurrenceId: number, fromDate?: Date): Promise<void>;

  // Project component operations
  getProjectComponents(projectId: number): Promise<ProjectComponent[]>;
  createProjectComponent(component: InsertProjectComponent): Promise<ProjectComponent>;
  updateProjectComponent(id: number, updates: Partial<InsertProjectComponent>): Promise<ProjectComponent>;
  deleteProjectComponent(id: number): Promise<void>;

  // Inflow/Outflow Type operations
  getProjectInflowTypes(projectId: number): Promise<InflowType[]>;
  createInflowType(inflowType: InsertInflowType): Promise<InflowType>;
  updateInflowType(id: number, updates: Partial<InsertInflowType>): Promise<InflowType>;
  deleteInflowType(id: number): Promise<void>;

  getProjectOutflowTypes(projectId: number): Promise<OutflowType[]>;
  createOutflowType(outflowType: InsertOutflowType): Promise<OutflowType>;
  updateOutflowType(id: number, updates: Partial<InsertOutflowType>): Promise<OutflowType>;
  deleteOutflowType(id: number): Promise<void>;

  // Financial operations
  getProjectBudgets(projectId: number): Promise<ProjectBudget[]>;
  createProjectBudget(budget: InsertProjectBudget): Promise<ProjectBudget>;
  updateProjectBudget(id: number, updates: Partial<InsertProjectBudget>): Promise<ProjectBudget>;
  deleteProjectBudget(id: number): Promise<void>;

  getProjectInflows(projectId: number): Promise<ProjectInflow[]>;
  createProjectInflow(inflow: InsertProjectInflow): Promise<ProjectInflow>;
  updateProjectInflow(id: number, updates: Partial<InsertProjectInflow>): Promise<ProjectInflow>;
  deleteProjectInflow(id: number): Promise<void>;

  getProjectOutflows(projectId: number): Promise<ProjectOutflow[]>;
  createProjectOutflow(outflow: InsertProjectOutflow): Promise<ProjectOutflow>;
  updateProjectOutflow(id: number, updates: Partial<InsertProjectOutflow>): Promise<ProjectOutflow>;
  deleteProjectOutflow(id: number): Promise<void>;

  // Legacy methods for backward compatibility
  getProjectExpenses(projectId: number): Promise<ProjectExpense[]>;
  createProjectExpense(expense: InsertProjectExpense): Promise<ProjectExpense>;
  updateProjectExpense(id: number, updates: Partial<InsertProjectExpense>): Promise<ProjectExpense>;
  deleteProjectExpense(id: number): Promise<void>;

  getProjectRevenue(projectId: number): Promise<ProjectRevenue[]>;
  createProjectRevenue(revenue: InsertProjectRevenue): Promise<ProjectRevenue>;
  updateProjectRevenue(id: number, updates: Partial<InsertProjectRevenue>): Promise<ProjectRevenue>;
  deleteProjectRevenue(id: number): Promise<void>;

  // Activity tracking operations
  logActivity(activity: InsertActivityLog): Promise<ActivityLog>;
  getUserActivities(userId: string, limit?: number): Promise<ActivityLog[]>;
  getWorkspaceActivities(workspaceId: number, limit?: number): Promise<ActivityLog[]>;
  getRecentUserActivities(userId: string, hours?: number): Promise<ActivityLog[]>;

  // Seeding operations
  seedDefaultTypesForProject(projectId: number, workspaceId: number): Promise<void>;

}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    try {
      console.log('Database upsertUser called with:', userData);
      
      // First try to find existing user by email
      if (userData.email) {
        const existingByEmail = await db
          .select()
          .from(users)
          .where(eq(users.email, userData.email))
          .limit(1);
        
        if (existingByEmail.length > 0) {
          console.log('Found existing user by email, updating:', existingByEmail[0].id);
          // Update existing user found by email
          const [updatedUser] = await db
            .update(users)
            .set({
              ...userData,
              updatedAt: new Date(),
            })
            .where(eq(users.id, existingByEmail[0].id))
            .returning();
          console.log('Database upsertUser successful (updated by email):', updatedUser);
          return updatedUser;
        }
      }
      
      // If no existing user by email, try regular upsert by ID
      const [user] = await db
        .insert(users)
        .values(userData)
        .onConflictDoUpdate({
          target: users.id,
          set: {
            ...userData,
            updatedAt: new Date(),
          },
        })
        .returning();
      console.log('Database upsertUser successful (new or updated by ID):', user);
      return user;
    } catch (error) {
      console.error('Database upsertUser failed:', error);
      console.error('User data that failed:', userData);
      throw error;
    }
  }

  async ensureUserSetup(userId: string): Promise<{ workspace: Workspace; project: Project }> {
    // Check if user already has a personal workspace
    const existingWorkspaces = await this.getUserWorkspaces(userId);
    let personalWorkspace = existingWorkspaces.find(w => w.type === 'personal');

    if (!personalWorkspace) {
      // Create personal workspace
      personalWorkspace = await this.createWorkspace({
        name: 'My Personal Workspace',
        type: 'personal',
        ownerId: userId,
      });

      // Get user details for proper name display
      const user = await this.getUser(userId);
      const userName = user?.firstName && user?.lastName 
        ? `${user.firstName} ${user.lastName}`
        : user?.email || 'Owner';

      // Add user as workspace member
      await this.addWorkspaceMember({
        workspaceId: personalWorkspace.id,
        userId: userId,
        name: userName,
        role: 'owner',
        memberType: 'user',
      });
    }

    // Check if workspace has a default project
    const existingProjects = await this.getWorkspaceProjects(personalWorkspace.id);
    let defaultProject = existingProjects.find(p => p.name === 'Default Project');

    if (!defaultProject) {
      // Create default project
      defaultProject = await this.createProject({
        name: 'Default Project',
        description: 'Your default project for organizing tasks',
        workspaceId: personalWorkspace.id,
        status: 'active',
      });
    }

    return { workspace: personalWorkspace, project: defaultProject };
  }

  // Workspace operations
  async getUserWorkspaces(userId: string): Promise<Workspace[]> {
    console.log(`DEBUG: getUserWorkspaces called for userId: ${userId}`);
    
    // Get workspaces owned by user and workspaces where user is a member
    const ownedWorkspaces = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.ownerId, userId));
    
    console.log(`DEBUG: Found ${ownedWorkspaces.length} owned workspaces:`, ownedWorkspaces.map(w => ({ id: w.id, name: w.name })));

    const memberWorkspaces = await db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        type: workspaces.type,
        ownerId: workspaces.ownerId,
        createdAt: workspaces.createdAt,
        updatedAt: workspaces.updatedAt,
      })
      .from(workspaces)
      .innerJoin(workspaceMembers, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.isActive, true)
      ));

    console.log(`DEBUG: Found ${memberWorkspaces.length} member workspaces:`, memberWorkspaces.map(w => ({ id: w.id, name: w.name })));

    // Combine and deduplicate
    const allWorkspaces = [...ownedWorkspaces, ...memberWorkspaces];
    console.log(`DEBUG: Combined workspaces before dedup: ${allWorkspaces.length}`);
    
    const uniqueWorkspaces = allWorkspaces.filter((workspace, index, self) => 
      index === self.findIndex(w => w.id === workspace.id)
    );

    console.log(`DEBUG: Final unique workspaces: ${uniqueWorkspaces.length}`, uniqueWorkspaces.map(w => ({ id: w.id, name: w.name })));
    return uniqueWorkspaces;
  }

  async getWorkspaceById(id: number): Promise<Workspace | undefined> {
    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id));
    return workspace;
  }

  async createWorkspace(workspace: InsertWorkspace): Promise<Workspace> {
    const [newWorkspace] = await db.insert(workspaces).values(workspace).returning();
    return newWorkspace;
  }

  async getWorkspaceMembers(workspaceId: number): Promise<WorkspaceMember[]> {
    const result = await db
      .select({
        id: workspaceMembers.id,
        workspaceId: workspaceMembers.workspaceId,
        userId: workspaceMembers.userId,
        memberType: workspaceMembers.memberType,
        name: workspaceMembers.name,
        role: workspaceMembers.role,
        alias: workspaceMembers.alias,
        systemPrompt: workspaceMembers.systemPrompt,
        isActive: workspaceMembers.isActive,
        createdAt: workspaceMembers.createdAt,
        updatedAt: workspaceMembers.updatedAt,
        user: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(workspaceMembers)
      .leftJoin(users, eq(workspaceMembers.userId, users.id))
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.isActive, true)))
      .orderBy(asc(workspaceMembers.name));
    
    // Transform the result to match WorkspaceMember interface
    return result.map(member => ({
      id: member.id,
      workspaceId: member.workspaceId,
      userId: member.userId,
      memberType: member.memberType,
      name: member.name,
      role: member.role,
      alias: member.alias,
      systemPrompt: member.systemPrompt,
      isActive: member.isActive,
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
      email: member.user?.email || null, // computed from user relation
    }));
  }

  async addWorkspaceMember(member: InsertWorkspaceMember): Promise<WorkspaceMember> {
    const [newMember] = await db.insert(workspaceMembers).values(member).returning();
    return newMember;
  }

  async updateWorkspaceMember(id: number, updates: Partial<InsertWorkspaceMember>): Promise<WorkspaceMember> {
    const [updatedMember] = await db
      .update(workspaceMembers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(workspaceMembers.id, id))
      .returning();
    return updatedMember;
  }

  async removeWorkspaceMember(id: number): Promise<void> {
    await db.update(workspaceMembers)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(workspaceMembers.id, id));
  }

  // Project operations
  async getWorkspaceProjects(workspaceId: number): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.workspaceId, workspaceId))
      .orderBy(desc(projects.updatedAt));
  }

  async getProjectById(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async updateProject(id: number, updates: Partial<InsertProject>): Promise<Project> {
    const [updatedProject] = await db
      .update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updatedProject;
  }

  async deleteProject(id: number): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Category operations
  async getWorkspaceCategories(workspaceId: number): Promise<Category[]> {
    return await db
      .select()
      .from(categories)
      .where(eq(categories.workspaceId, workspaceId))
      .orderBy(asc(categories.name));
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  async updateCategory(id: number, updates: Partial<InsertCategory>): Promise<Category> {
    const [updatedCategory] = await db
      .update(categories)
      .set(updates)
      .where(eq(categories.id, id))
      .returning();
    return updatedCategory;
  }

  async deleteCategory(id: number): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  // Task operations
  async getWorkspaceTasks(workspaceId: number): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.workspaceId, workspaceId))
      .orderBy(desc(tasks.updatedAt));
  }

  async getProjectTasks(projectId: number): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, projectId))
      .orderBy(desc(tasks.updatedAt));
  }

  async getUserTasks(userId: string, workspaceId: number): Promise<Task[]> {
    // First, get the workspace member ID for this user
    const [member] = await db
      .select({ id: workspaceMembers.id })
      .from(workspaceMembers)
      .where(and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.isActive, true)
      ));

    if (!member) {
      return []; // User is not a member of this workspace
    }

    // Now get tasks assigned to this member
    return await db
      .select()
      .from(tasks)
      .where(and(
        eq(tasks.assignedMemberId, member.id),
        eq(tasks.workspaceId, workspaceId)
      ))
      .orderBy(desc(tasks.updatedAt));
  }

  async getTaskById(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }

  async updateTask(id: number, updates: Partial<InsertTask>): Promise<Task> {
    const [updatedTask] = await db
      .update(tasks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return updatedTask;
  }

  async deleteTask(id: number): Promise<void> {
    // Delete related notifications first to avoid foreign key constraint violations
    await db.delete(notifications).where(eq(notifications.taskId, id));
    
    // Delete related task comments
    await db.delete(taskComments).where(eq(taskComments.taskId, id));
    
    // Delete the task
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async getTasksByRecurrenceId(recurrenceId: number): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.taskRecurrenceId, recurrenceId));
  }

  async getDueTodayTasks(workspaceId: number): Promise<Task[]> {
    const today = new Date().toISOString().split('T')[0];
    return await db
      .select()
      .from(tasks)
      .where(and(
        eq(tasks.workspaceId, workspaceId),
        eq(tasks.dueDate, today),
        eq(tasks.status, 'todo')
      ))
      .orderBy(asc(tasks.dueTime));
  }

  // Project pages operations
  async getProjectPages(projectId: number): Promise<ProjectPage[]> {
    return await db
      .select()
      .from(projectPages)
      .where(eq(projectPages.projectId, projectId))
      .orderBy(asc(projectPages.title));
  }

  async createProjectPage(page: InsertProjectPage): Promise<ProjectPage> {
    const [newPage] = await db.insert(projectPages).values(page).returning();
    return newPage;
  }

  async updateProjectPage(id: number, updates: Partial<InsertProjectPage>): Promise<ProjectPage> {
    const [updatedPage] = await db
      .update(projectPages)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projectPages.id, id))
      .returning();
    return updatedPage;
  }

  async deleteProjectPage(id: number): Promise<void> {
    await db.delete(projectPages).where(eq(projectPages.id, id));
  }

  // Brain dump operations
  async getUserBrainDumpItems(workspaceId: number, userId: string): Promise<BrainDumpItem[]> {
    return await db
      .select()
      .from(brainDumpItems)
      .where(and(
        eq(brainDumpItems.workspaceId, workspaceId),
        eq(brainDumpItems.userId, userId)
      ))
      .orderBy(desc(brainDumpItems.createdAt));
  }

  async createBrainDumpItem(item: InsertBrainDumpItem): Promise<BrainDumpItem> {
    const [newItem] = await db.insert(brainDumpItems).values(item).returning();
    return newItem;
  }

  async deleteBrainDumpItem(id: number): Promise<void> {
    await db.delete(brainDumpItems).where(eq(brainDumpItems.id, id));
  }

  async clearUserBrainDump(workspaceId: number, userId: string): Promise<void> {
    await db.delete(brainDumpItems).where(and(
      eq(brainDumpItems.workspaceId, workspaceId),
      eq(brainDumpItems.userId, userId)
    ));
  }

  // File operations
  async getWorkspaceFiles(workspaceId: number): Promise<File[]> {
    return await db
      .select()
      .from(files)
      .where(eq(files.workspaceId, workspaceId))
      .orderBy(desc(files.createdAt));
  }

  async getProjectFiles(projectId: number): Promise<File[]> {
    return await db
      .select()
      .from(files)
      .where(eq(files.projectId, projectId))
      .orderBy(desc(files.createdAt));
  }

  async createFile(file: InsertFile): Promise<File> {
    const [newFile] = await db.insert(files).values(file).returning();
    return newFile;
  }

  async updateFile(id: number, updates: Partial<InsertFile>): Promise<File> {
    const [updatedFile] = await db
      .update(files)
      .set(updates)
      .where(eq(files.id, id))
      .returning();
    return updatedFile;
  }

  async deleteFile(id: number): Promise<void> {
    await db.delete(files).where(eq(files.id, id));
  }

  // Chat operations - enhanced with conversation threads
  async getWorkspaceChatHistory(workspaceId: number, limit: number = 50): Promise<ChatConversation[]> {
    return await db
      .select()
      .from(chatConversations)
      .where(eq(chatConversations.workspaceId, workspaceId))
      .orderBy(desc(chatConversations.createdAt))
      .limit(limit);
  }

  async getConversationMessages(workspaceId: number, conversationId: string): Promise<ChatConversation[]> {
    return await db
      .select()
      .from(chatConversations)
      .where(
        and(
          eq(chatConversations.workspaceId, workspaceId),
          eq(chatConversations.conversationId, conversationId)
        )
      )
      .orderBy(chatConversations.createdAt);
  }

  async getWorkspaceConversations(workspaceId: number, userId: string): Promise<{
    conversationId: string;
    title: string | null;
    lastMessage: string;
    lastActivity: Date;
    messageCount: number;
  }[]> {
    const conversations = await db
      .select({
        conversationId: chatConversations.conversationId,
        title: chatConversations.title,
        message: chatConversations.message,
        createdAt: chatConversations.createdAt,
      })
      .from(chatConversations)
      .where(
        and(
          eq(chatConversations.workspaceId, workspaceId),
          eq(chatConversations.userId, userId)
        )
      )
      .orderBy(desc(chatConversations.createdAt));

    // Group by conversationId and get summary info
    const conversationMap = new Map();
    
    conversations.forEach(conv => {
      if (!conversationMap.has(conv.conversationId)) {
        conversationMap.set(conv.conversationId, {
          conversationId: conv.conversationId,
          title: conv.title || this.generateConversationTitle(conv.message),
          lastMessage: conv.message,
          lastActivity: conv.createdAt,
          messageCount: 1
        });
      } else {
        const existing = conversationMap.get(conv.conversationId);
        existing.messageCount += 1;
        if (conv.createdAt && existing.lastActivity && conv.createdAt > existing.lastActivity) {
          existing.lastActivity = conv.createdAt;
          existing.lastMessage = conv.message;
        }
      }
    });

    return Array.from(conversationMap.values())
      .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
  }

  private generateConversationTitle(firstMessage: string): string {
    // Generate a short title from the first message
    const words = firstMessage.split(' ').slice(0, 6);
    return words.join(' ') + (firstMessage.split(' ').length > 6 ? '...' : '');
  }

  async createChatConversation(conversation: InsertChatConversation): Promise<ChatConversation> {
    const [newConversation] = await db.insert(chatConversations).values(conversation).returning();
    return newConversation;
  }

  async updateConversationTitle(workspaceId: number, conversationId: string, title: string): Promise<void> {
    await db
      .update(chatConversations)
      .set({ title })
      .where(
        and(
          eq(chatConversations.workspaceId, workspaceId),
          eq(chatConversations.conversationId, conversationId)
        )
      );
  }

  async deleteConversation(workspaceId: number, conversationId: string): Promise<void> {
    await db
      .delete(chatConversations)
      .where(
        and(
          eq(chatConversations.workspaceId, workspaceId),
          eq(chatConversations.conversationId, conversationId)
        )
      );
  }

  // Invitation operations
  async createWorkspaceInvitation(invitation: InsertWorkspaceInvitation): Promise<WorkspaceInvitation> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration
    
    const [workspaceInvitation] = await db
      .insert(workspaceInvitations)
      .values({
        ...invitation,
        expiresAt,
      })
      .returning();
    return workspaceInvitation;
  }

  async getWorkspaceInvitations(workspaceId: number): Promise<WorkspaceInvitation[]> {
    return await db
      .select()
      .from(workspaceInvitations)
      .where(eq(workspaceInvitations.workspaceId, workspaceId));
  }

  async getInvitationById(id: number): Promise<WorkspaceInvitation | undefined> {
    const [invitation] = await db
      .select()
      .from(workspaceInvitations)
      .where(eq(workspaceInvitations.id, id));
    return invitation;
  }

  async getPendingInvitations(email: string): Promise<WorkspaceInvitation[]> {
    return await db
      .select()
      .from(workspaceInvitations)
      .where(
        and(
          eq(workspaceInvitations.email, email),
          eq(workspaceInvitations.status, 'pending')
        )
      );
  }

  async acceptInvitation(invitationId: number, userId: string): Promise<void> {
    // Get the invitation
    const [invitation] = await db
      .select()
      .from(workspaceInvitations)
      .where(eq(workspaceInvitations.id, invitationId));

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    // Get user info
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Add user to workspace with proper name handling
    let displayName = 'User';
    
    if (user.firstName && user.lastName) {
      displayName = `${user.firstName} ${user.lastName}`;
    } else if (user.firstName) {
      displayName = user.firstName;
    } else if (user.email) {
      // Extract name from email (e.g., "john.doe@example.com" -> "John Doe")
      const emailName = user.email.split('@')[0];
      const nameParts = emailName.split(/[._-]/);
      displayName = nameParts
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
    }
    
    await this.addWorkspaceMember({
      workspaceId: invitation.workspaceId,
      userId: userId,
      memberType: 'user',
      name: displayName,
      role: 'member',
    });

    // Update invitation status
    await db
      .update(workspaceInvitations)
      .set({ status: 'accepted' })
      .where(eq(workspaceInvitations.id, invitationId));
  }

  // Notification operations
  async getUserNotifications(userId: string, workspaceId: number): Promise<Notification[]> {
    return db.select()
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.workspaceId, workspaceId)
      ))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(notification).returning();
    return created;
  }

  async markNotificationAsRead(id: number): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
  }

  async markAllNotificationsAsRead(userId: string, workspaceId: number): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.workspaceId, workspaceId),
        eq(notifications.isRead, false)
      ));
  }

  async getUnreadNotificationCount(userId: string, workspaceId: number): Promise<number> {
    const result = await db.select({ count: count() })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.workspaceId, workspaceId),
        eq(notifications.isRead, false)
      ));
    return result[0]?.count || 0;
  }

  // Task comment operations
  async getTaskComments(taskId: number): Promise<TaskComment[]> {
    const comments = await db
      .select({
        id: taskComments.id,
        taskId: taskComments.taskId,
        userId: taskComments.userId,
        workspaceId: taskComments.workspaceId,
        comment: taskComments.comment,
        createdAt: taskComments.createdAt,
        userName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.email})`.as('userName')
      })
      .from(taskComments)
      .leftJoin(users, eq(taskComments.userId, users.id))
      .where(eq(taskComments.taskId, taskId))
      .orderBy(asc(taskComments.createdAt));
    
    return comments as TaskComment[];
  }

  async createTaskComment(comment: InsertTaskComment): Promise<TaskComment> {
    const [created] = await db.insert(taskComments).values(comment).returning();
    return created;
  }

  async deleteTaskComment(id: number): Promise<void> {
    await db.delete(taskComments).where(eq(taskComments.id, id));
  }

  // Task recurrence operations
  async createTaskRecurrence(recurrence: InsertTaskRecurrence): Promise<TaskRecurrence> {
    const [created] = await db.insert(taskRecurrences).values(recurrence).returning();
    return created;
  }

  async getTaskRecurrence(id: number): Promise<TaskRecurrence | undefined> {
    const [recurrence] = await db.select().from(taskRecurrences).where(eq(taskRecurrences.id, id));
    return recurrence;
  }

  async updateTaskRecurrence(id: number, updates: Partial<InsertTaskRecurrence>): Promise<TaskRecurrence> {
    const [updated] = await db
      .update(taskRecurrences)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(taskRecurrences.id, id))
      .returning();
    return updated;
  }

  async deleteTaskRecurrence(id: number): Promise<void> {
    await db.delete(taskRecurrences).where(eq(taskRecurrences.id, id));
  }

  async deleteRecurringTaskInstances(recurrenceId: number, fromDate?: Date): Promise<void> {
    if (fromDate) {
      // Delete only future instances from the specified date
      await db.delete(tasks)
        .where(and(
          eq(tasks.taskRecurrenceId, recurrenceId),
          gte(tasks.dueDate, fromDate.toISOString().split('T')[0])
        ));
    } else {
      // Delete all recurring instances by clearing the recurrence reference
      await db.update(tasks)
        .set({ taskRecurrenceId: null })
        .where(eq(tasks.taskRecurrenceId, recurrenceId));
    }
  }

  // Project component operations
  async getProjectComponents(projectId: number): Promise<ProjectComponent[]> {
    return await db
      .select()
      .from(projectComponents)
      .where(eq(projectComponents.projectId, projectId))
      .orderBy(asc(projectComponents.order), asc(projectComponents.name));
  }

  async createProjectComponent(component: InsertProjectComponent): Promise<ProjectComponent> {
    const [newComponent] = await db.insert(projectComponents).values(component).returning();
    return newComponent;
  }

  async updateProjectComponent(id: number, updates: Partial<InsertProjectComponent>): Promise<ProjectComponent> {
    const [updatedComponent] = await db
      .update(projectComponents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projectComponents.id, id))
      .returning();
    return updatedComponent;
  }

  async deleteProjectComponent(id: number): Promise<void> {
    await db.delete(projectComponents).where(eq(projectComponents.id, id));
  }

  // Inflow/Outflow Type operations
  async getProjectInflowTypes(projectId: number): Promise<InflowType[]> {
    return await db.select().from(inflowTypes).where(eq(inflowTypes.projectId, projectId)).orderBy(inflowTypes.name);
  }

  async createInflowType(inflowType: InsertInflowType): Promise<InflowType> {
    const [created] = await db.insert(inflowTypes).values(inflowType).returning();
    return created;
  }

  async updateInflowType(id: number, updates: Partial<InsertInflowType>): Promise<InflowType> {
    const [updated] = await db.update(inflowTypes).set(updates).where(eq(inflowTypes.id, id)).returning();
    return updated;
  }

  async deleteInflowType(id: number): Promise<void> {
    await db.delete(inflowTypes).where(eq(inflowTypes.id, id));
  }

  async getProjectOutflowTypes(projectId: number): Promise<OutflowType[]> {
    return await db.select().from(outflowTypes).where(eq(outflowTypes.projectId, projectId)).orderBy(outflowTypes.name);
  }

  async createOutflowType(outflowType: InsertOutflowType): Promise<OutflowType> {
    const [created] = await db.insert(outflowTypes).values(outflowType).returning();
    return created;
  }

  async updateOutflowType(id: number, updates: Partial<InsertOutflowType>): Promise<OutflowType> {
    const [updated] = await db.update(outflowTypes).set(updates).where(eq(outflowTypes.id, id)).returning();
    return updated;
  }

  async deleteOutflowType(id: number): Promise<void> {
    await db.delete(outflowTypes).where(eq(outflowTypes.id, id));
  }

  // Project inflow/outflow operations
  async getProjectInflows(projectId: number): Promise<ProjectInflow[]> {
    return await db.select().from(projectInflows).where(eq(projectInflows.projectId, projectId)).orderBy(desc(projectInflows.date));
  }

  async createProjectInflow(inflow: InsertProjectInflow): Promise<ProjectInflow> {
    const [created] = await db.insert(projectInflows).values(inflow).returning();
    return created;
  }

  async updateProjectInflow(id: number, updates: Partial<InsertProjectInflow>): Promise<ProjectInflow> {
    const [updated] = await db.update(projectInflows).set(updates).where(eq(projectInflows.id, id)).returning();
    return updated;
  }

  async deleteProjectInflow(id: number): Promise<void> {
    await db.delete(projectInflows).where(eq(projectInflows.id, id));
  }

  async getProjectOutflows(projectId: number): Promise<ProjectOutflow[]> {
    return await db.select().from(projectOutflows).where(eq(projectOutflows.projectId, projectId)).orderBy(desc(projectOutflows.date));
  }

  async createProjectOutflow(outflow: InsertProjectOutflow): Promise<ProjectOutflow> {
    const [created] = await db.insert(projectOutflows).values(outflow).returning();
    return created;
  }

  async updateProjectOutflow(id: number, updates: Partial<InsertProjectOutflow>): Promise<ProjectOutflow> {
    const [updated] = await db.update(projectOutflows).set(updates).where(eq(projectOutflows.id, id)).returning();
    return updated;
  }

  async deleteProjectOutflow(id: number): Promise<void> {
    await db.delete(projectOutflows).where(eq(projectOutflows.id, id));
  }

  // Legacy methods for backward compatibility - redirect to new outflow/inflow methods
  async getProjectExpenses(projectId: number): Promise<ProjectExpense[]> {
    return await this.getProjectOutflows(projectId);
  }

  async createProjectExpense(expense: InsertProjectExpense): Promise<ProjectExpense> {
    return await this.createProjectOutflow(expense);
  }

  async updateProjectExpense(id: number, updates: Partial<InsertProjectExpense>): Promise<ProjectExpense> {
    return await this.updateProjectOutflow(id, updates);
  }

  async deleteProjectExpense(id: number): Promise<void> {
    return await this.deleteProjectOutflow(id);
  }

  async getProjectRevenue(projectId: number): Promise<ProjectRevenue[]> {
    return await this.getProjectInflows(projectId);
  }

  async createProjectRevenue(revenue: InsertProjectRevenue): Promise<ProjectRevenue> {
    return await this.createProjectInflow(revenue);
  }

  async updateProjectRevenue(id: number, updates: Partial<InsertProjectRevenue>): Promise<ProjectRevenue> {
    return await this.updateProjectInflow(id, updates);
  }

  async deleteProjectRevenue(id: number): Promise<void> {
    return await this.deleteProjectInflow(id);
  }

  // Financial operations
  async getProjectBudgets(projectId: number): Promise<ProjectBudget[]> {
    return await db.select().from(projectBudgets).where(eq(projectBudgets.projectId, projectId)).orderBy(projectBudgets.id);
  }

  async createProjectBudget(budget: InsertProjectBudget): Promise<ProjectBudget> {
    const [created] = await db.insert(projectBudgets).values(budget).returning();
    return created;
  }

  async updateProjectBudget(id: number, updates: Partial<InsertProjectBudget>): Promise<ProjectBudget> {
    const [updated] = await db.update(projectBudgets).set(updates).where(eq(projectBudgets.id, id)).returning();
    return updated;
  }

  async deleteProjectBudget(id: number): Promise<void> {
    await db.delete(projectBudgets).where(eq(projectBudgets.id, id));
  }



  // Activity tracking operations
  async logActivity(activity: InsertActivityLog): Promise<ActivityLog> {
    const [created] = await db.insert(activityLogs).values(activity).returning();
    return created;
  }

  async getUserActivities(userId: string, limit: number = 50): Promise<ActivityLog[]> {
    return await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.userId, userId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);
  }

  async getWorkspaceActivities(workspaceId: number, limit: number = 50): Promise<ActivityLog[]> {
    return await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.workspaceId, workspaceId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);
  }

  async getRecentUserActivities(userId: string, hours: number = 24): Promise<ActivityLog[]> {
    const hoursAgo = new Date(Date.now() - hours * 60 * 60 * 1000);
    return await db
      .select()
      .from(activityLogs)
      .where(
        and(
          eq(activityLogs.userId, userId),
          gte(activityLogs.createdAt, hoursAgo)
        )
      )
      .orderBy(desc(activityLogs.createdAt));
  }

  // Seeding functionality for default types
  async seedDefaultOutflowTypes(projectId: number, workspaceId: number): Promise<void> {
    const defaultOutflowTypes = [
      { name: "Petty Cash Expense", description: "Small miscellaneous expenses and cash payments" },
      { name: "Salary Expense", description: "Employee salaries and wages" },
      { name: "Office Supplies", description: "Stationery, printing, and office materials" },
      { name: "Software Subscriptions", description: "Monthly/yearly software and service subscriptions" },
      { name: "Marketing Expenses", description: "Advertising and promotional costs" },
      { name: "Travel Expenses", description: "Business travel and transportation costs" }
    ];

    // Check if types already exist to avoid duplicates
    const existingTypes = await this.getProjectOutflowTypes(projectId);
    const existingNames = existingTypes.map(type => type.name);

    for (const type of defaultOutflowTypes) {
      if (!existingNames.includes(type.name)) {
        await this.createOutflowType({ ...type, projectId, workspaceId });
      }
    }
  }

  async seedDefaultInflowTypes(projectId: number, workspaceId: number): Promise<void> {
    const defaultInflowTypes = [
      { name: "Revenue Income", description: "Primary business revenue and sales" },
      { name: "Donation Fund", description: "Charitable donations and funding" },
      { name: "Investment Returns", description: "Returns from investments and portfolios" },
      { name: "Grant Income", description: "Government grants and institutional funding" },
      { name: "Consulting Revenue", description: "Income from consulting services" },
      { name: "Subscription Revenue", description: "Recurring subscription income" }
    ];

    // Check if types already exist to avoid duplicates
    const existingTypes = await this.getProjectInflowTypes(projectId);
    const existingNames = existingTypes.map(type => type.name);

    for (const type of defaultInflowTypes) {
      if (!existingNames.includes(type.name)) {
        await this.createInflowType({ ...type, projectId, workspaceId });
      }
    }
  }

  async seedDefaultTypesForProject(projectId: number, workspaceId: number): Promise<void> {
    await this.seedDefaultOutflowTypes(projectId, workspaceId);
    await this.seedDefaultInflowTypes(projectId, workspaceId);
  }

}

export const storage = new DatabaseStorage();
