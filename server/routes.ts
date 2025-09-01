import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { processAIQuery, generateTaskSuggestions, generateProjectInsights } from "./openai";
import { buildActivityContext } from "./activityMiddleware";
import { sendWorkspaceInvitation, sendTaskNotification } from "./email";
import { generateRecurringTasks, createRecurrenceFromFormData } from "./recurrence-utils";
import { parseISO } from "date-fns";
import { 
  insertWorkspaceSchema,
  insertWorkspaceMemberSchema,
  insertWorkspaceInvitationSchema,
  insertProjectSchema,
  insertCategorySchema,
  insertTaskSchema,
  insertProjectPageSchema,
  insertBrainDumpItemSchema,
  insertChatConversationSchema,
  insertNotificationSchema,
  insertTaskCommentSchema,
  insertProjectComponentSchema,
  insertProjectBudgetSchema,
  insertProjectExpenseSchema,
  insertProjectRevenueSchema,
  insertOutflowTypeSchema,
  insertInflowTypeSchema,
  insertTaskRecurrenceSchema,
} from "@shared/schema";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Helper function for creating task notifications with email alerts
async function getProjectInvolvedUsers(projectId: number, workspaceId: number): Promise<any[]> {
  try {
    // Get all tasks in the project to find users who have tasks assigned
    const projectTasks = await storage.getProjectTasks(projectId);
    const involvedUserIds = new Set<string>();
    
    // Add users who have tasks assigned in this project
    projectTasks.forEach(task => {
      if (task.assignedMemberId) {
        // We need to get the userId from the member ID
        // This will be resolved in the calling function
        involvedUserIds.add(task.assignedMemberId.toString());
      }
    });
    
    // Get workspace members to resolve member IDs to user IDs
    const workspaceMembers = await storage.getWorkspaceMembers(workspaceId);
    const workspace = await storage.getWorkspaceById(workspaceId);
    const involvedUsers = [];
    
    for (const member of workspaceMembers) {
      // Include if user has tasks in this project OR is workspace owner
      const isProjectInvolved = involvedUserIds.has(member.id.toString());
      const isWorkspaceOwner = workspace && member.userId === workspace.ownerId;
      
      if ((isProjectInvolved || isWorkspaceOwner) && member.userId) {
        const user = await storage.getUser(member.userId);
        if (user) {
          involvedUsers.push({ member, user });
        }
      }
    }
    
    return involvedUsers;
  } catch (error) {
    console.error('Failed to get project involved users:', error);
    return [];
  }
}

async function createTaskNotification(data: {
  type: 'task_assigned' | 'task_completed' | 'comment_added' | 'task_status_changed';
  userId: string;
  workspaceId: number;
  taskId: number;
  title: string;
  message: string;
  assignedUser: any;
  task: any;
  commenterName?: string;
  commentText?: string;
  statusChange?: {
    from: string;
    to: string;
  };
}) {
  try {
    // Create notification in database
    await storage.createNotification({
      workspaceId: data.workspaceId,
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      taskId: data.taskId,
      isRead: false,
      emailSent: true,
    });

    // Get workspace name for context
    const workspace = await storage.getWorkspaceById(data.workspaceId);

    // Send email notification
    await sendTaskNotification({
      toEmail: data.assignedUser.email,
      recipientName: data.assignedUser.firstName || data.assignedUser.email.split('@')[0],
      taskTitle: data.task.title,
      taskDescription: data.task.description || '',
      notificationType: data.type,
      assignerName: data.commenterName,
      commenterName: data.commenterName,
      commentText: data.commentText,
      workspaceName: workspace?.name,
      statusChange: data.statusChange,
    });
  } catch (error) {
    console.error('Failed to create task notification:', error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Test email route (no auth required for testing)
  app.get('/api/test-email', async (req: any, res) => {
    try {
      const { testEmailConnection } = await import("./email");
      const isConnected = await testEmailConnection();
      res.json({ 
        connected: isConnected,
        message: isConnected ? "Email configuration is working" : "Email configuration failed"
      });
    } catch (error) {
      res.status(500).json({ 
        connected: false, 
        message: "Email service not configured",
        error: error.message
      });
    }
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Ensure user setup (personal workspace and default project) for existing users
      if (user) {
        await storage.ensureUserSetup(userId);
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Workspace routes
  app.get('/api/workspaces', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const workspaces = await storage.getUserWorkspaces(userId);
      res.json(workspaces);
    } catch (error) {
      console.error("Error fetching workspaces:", error);
      res.status(500).json({ message: "Failed to fetch workspaces" });
    }
  });

  app.post('/api/workspaces', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name, type } = req.body;
      
      console.log("Creating workspace for user:", userId);
      console.log("Request body:", req.body);
      
      // Basic validation
      if (!name || !name.trim()) {
        return res.status(400).json({ message: "Workspace name is required" });
      }
      
      if (!type || !['personal', 'team'].includes(type)) {
        return res.status(400).json({ message: "Valid workspace type is required" });
      }
      
      const workspaceData = {
        name: name.trim(),
        type: type,
        ownerId: userId,
      };
      
      console.log("Creating workspace with data:", workspaceData);
      
      const workspace = await storage.createWorkspace(workspaceData);
      console.log("Created workspace:", workspace);
      
      // Add owner as admin member
      const memberData = {
        workspaceId: workspace.id,
        userId: userId,
        memberType: 'user',
        name: req.user.claims.first_name && req.user.claims.last_name 
          ? `${req.user.claims.first_name} ${req.user.claims.last_name}`
          : req.user.claims.email || 'User',
        role: 'admin',
      };
      
      console.log("Adding workspace member with data:", memberData);
      
      await storage.addWorkspaceMember(memberData);
      
      // Seed default outflow and inflow types for the new workspace
      await storage.seedDefaultTypesForWorkspace(workspace.id);
      
      console.log("Successfully created workspace and added member");
      
      res.json(workspace);
    } catch (error: any) {
      console.error("Error creating workspace:", error);
      res.status(500).json({ 
        message: error.message || "Failed to create workspace" 
      });
    }
  });

  app.get('/api/workspaces/:id', isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.id);
      const workspace = await storage.getWorkspaceById(workspaceId);
      
      if (!workspace) {
        return res.status(404).json({ message: "Workspace not found" });
      }
      
      res.json(workspace);
    } catch (error) {
      console.error("Error fetching workspace:", error);
      res.status(500).json({ message: "Failed to fetch workspace" });
    }
  });

  // Workspace members routes
  app.get('/api/workspaces/:id/members', isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.id);
      const members = await storage.getWorkspaceMembers(workspaceId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching workspace members:", error);
      res.status(500).json({ message: "Failed to fetch workspace members" });
    }
  });

  // Helper function to check if user is workspace owner
  async function isWorkspaceOwner(workspaceId: number, userId: string): Promise<boolean> {
    const workspace = await storage.getWorkspaceById(workspaceId);
    return workspace?.ownerId === userId;
  }

  app.post('/api/workspaces/:id/members', isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.id);
      const { memberType, email, name, alias, systemPrompt } = req.body;
      const userId = req.user.claims.sub;
      
      // Check if user is workspace owner
      const isOwner = await isWorkspaceOwner(workspaceId, userId);
      if (!isOwner) {
        return res.status(403).json({ message: "Only workspace owners can add members" });
      }
      
      if (memberType === 'agent') {
        // For AI agents, create directly as workspace member
        const memberData = {
          workspaceId,
          memberType: 'agent',
          name: name || 'AI Agent',
          alias,
          systemPrompt,
          role: 'agent',
          userId: null,
        };
        
        const member = await storage.addWorkspaceMember(memberData);
        res.json(member);
      } else {
        // For users, create invitation (not direct member)
        const invitationData = {
          workspaceId,
          email,
          invitedBy: userId,
        };
        
        const invitation = await storage.createWorkspaceInvitation(invitationData);
        
        // Get workspace and inviter info for email
        const workspace = await storage.getWorkspaceById(workspaceId);
        const inviter = await storage.getUser(userId);
        
        if (workspace && inviter) {
          // Send invitation email
          const emailSent = await sendWorkspaceInvitation({
            toEmail: email,
            workspaceName: workspace.name,
            inviterName: inviter.firstName && inviter.lastName 
              ? `${inviter.firstName} ${inviter.lastName}`
              : inviter.email || 'Team Member',
            invitationLink: `${process.env.SITE_URL || `https://${req.hostname}`}/accept-invitation?token=${invitation.id}`,
          });
          
          res.json({ 
            invitation, 
            message: emailSent 
              ? "Invitation sent successfully" 
              : "Invitation created but email delivery failed"
          });
        } else {
          res.json({ invitation, message: "Invitation created successfully" });
        }
      }
    } catch (error) {
      console.error("Error adding workspace member/invitation:", error);
      res.status(500).json({ message: "Failed to add workspace member" });
    }
  });

  // Remove workspace member
  app.delete('/api/workspaces/:workspaceId/members/:memberId', isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);
      const memberId = parseInt(req.params.memberId);
      const userId = req.user.claims.sub;
      
      // Check if user is workspace owner
      const isOwner = await isWorkspaceOwner(workspaceId, userId);
      if (!isOwner) {
        return res.status(403).json({ message: "Only workspace owners can remove members" });
      }
      
      // Get the member to check if it's the owner trying to remove themselves
      const member = await storage.getWorkspaceMembers(workspaceId);
      const memberToRemove = member.find((m: any) => m.id === memberId);
      
      if (!memberToRemove) {
        return res.status(404).json({ message: "Member not found" });
      }
      
      // Prevent owner from removing themselves
      if (memberToRemove.userId === userId) {
        return res.status(400).json({ message: "Workspace owners cannot remove themselves" });
      }
      
      await storage.removeWorkspaceMember(memberId);
      res.json({ message: "Member removed successfully" });
    } catch (error) {
      console.error("Error removing workspace member:", error);
      res.status(500).json({ message: "Failed to remove workspace member" });
    }
  });

  // Invitation routes
  app.get('/api/workspaces/:id/invitations', isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.id);
      const invitations = await storage.getWorkspaceInvitations(workspaceId);
      res.json(invitations);
    } catch (error) {
      console.error("Error fetching invitations:", error);
      res.status(500).json({ message: "Failed to fetch invitations" });
    }
  });

  app.get('/api/auth/pending-invitations', isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.user.claims.email;
      if (!userEmail) {
        return res.json([]);
      }
      
      const invitations = await storage.getPendingInvitations(userEmail);
      res.json(invitations);
    } catch (error) {
      console.error("Error fetching pending invitations:", error);
      res.status(500).json({ message: "Failed to fetch pending invitations" });
    }
  });

  // Accept invitation route  
  app.post('/api/invitations/:id/accept', async (req, res) => {
    try {
      const invitationParam = req.params.id;
      let invitationId: number;
      
      // Check if the parameter is a number (ID) or treat it as a token
      if (isNaN(parseInt(invitationParam))) {
        // It's a token, find the invitation by token (assume token = ID for now)
        invitationId = parseInt(invitationParam);
      } else {
        invitationId = parseInt(invitationParam);
      }
      
      if (!req.isAuthenticated()) {
        return res.status(401).json({ 
          message: "Please log in first to accept this invitation",
          redirectToLogin: true 
        });
      }
      
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      
      // Get the invitation directly by ID
      const invitation = await storage.getInvitationById(invitationId);
      
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      
      // Check if invitation is for this user's email
      if (invitation.email !== req.user.claims.email) {
        return res.status(403).json({ message: "This invitation is not for your email address" });
      }
      
      // Get workspace details
      const workspace = await storage.getWorkspaceById(invitation.workspaceId);
      
      await storage.acceptInvitation(invitationId, userId);
      
      res.json({ 
        message: "Invitation accepted successfully",
        workspaceName: workspace?.name || "workspace"
      });
    } catch (error) {
      console.error("Error accepting invitation:", error);
      res.status(500).json({ message: "Failed to accept invitation" });
    }
  });

  // Project routes
  app.get('/api/workspaces/:id/projects', isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.id);
      const projects = await storage.getWorkspaceProjects(workspaceId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.post('/api/workspaces/:id/projects', isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.id);
      const projectData = insertProjectSchema.parse({
        ...req.body,
        workspaceId,
      });
      
      const project = await storage.createProject(projectData);
      
      // Automatically seed default financial types for the new project
      await storage.seedDefaultTypesForProject(project.id, workspaceId);
      
      res.json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.get('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.patch('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const updates = req.body;
      
      const project = await storage.updateProject(projectId, updates);
      res.json(project);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  // Category routes
  app.get('/api/workspaces/:id/categories', isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.id);
      const categories = await storage.getWorkspaceCategories(workspaceId);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post('/api/workspaces/:id/categories', isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.id);
      const categoryData = insertCategorySchema.parse({
        ...req.body,
        workspaceId,
      });
      
      const category = await storage.createCategory(categoryData);
      res.json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.patch('/api/categories/:id', isAuthenticated, async (req: any, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      const updates = req.body;
      
      const category = await storage.updateCategory(categoryId, updates);
      res.json(category);
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  // Task routes
  app.get('/api/workspaces/:id/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.id);
      console.log(`Fetching tasks for workspace ${workspaceId}`);
      const tasks = await storage.getWorkspaceTasks(workspaceId);
      console.log(`Found ${tasks.length} tasks for workspace ${workspaceId}`);
      console.log(`Sample task IDs: ${tasks.slice(0, 5).map(t => t.id).join(', ')}`);
      console.log(`Response size: ${JSON.stringify(tasks).length} characters`);
      
      // Check for JSON serialization issues
      try {
        const serialized = JSON.stringify(tasks);
        console.log(`JSON serialization successful: ${serialized.length} chars`);
      } catch (jsonError) {
        console.error('JSON serialization error:', jsonError);
      }
      
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get('/api/workspaces/:id/tasks/due-today', isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.id);
      const tasks = await storage.getDueTodayTasks(workspaceId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching due today tasks:", error);
      res.status(500).json({ message: "Failed to fetch due today tasks" });
    }
  });

  app.post('/api/workspaces/:id/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.id);
      const formData = req.body;
      
      // Extract recurrence configuration
      const recurrenceConfig = createRecurrenceFromFormData(formData);
      
      if (recurrenceConfig && formData.dueDate) {
        // Handle recurring task creation
        const baseTaskData = {
          title: formData.title,
          description: formData.description,
          projectId: formData.projectId,
          categoryId: formData.categoryId,
          assignedMemberId: formData.assignedMemberId,
          priority: formData.priority || 0,
          status: formData.status || 'todo',
          timeSlot: formData.timeSlot,
          workspaceId,
        };
        
        // First create the task recurrence record
        const taskRecurrence = await storage.createTaskRecurrence({
          workspaceId,
          recurrenceType: recurrenceConfig.type,
          recurrencePattern: JSON.stringify(recurrenceConfig),
          interval: recurrenceConfig.interval,
          endType: recurrenceConfig.endType,
          endCount: recurrenceConfig.endCount,
          endDate: recurrenceConfig.endDate,
        });
        
        // Generate recurring task instances
        const startDate = parseISO(formData.dueDate);
        const recurringTasks = generateRecurringTasks(baseTaskData, startDate, recurrenceConfig);
        
        // Create all task instances with recurrence reference
        const createdTasks = [];
        for (const taskData of recurringTasks) {
          const taskWithRecurrence = insertTaskSchema.parse({
            ...taskData,
            taskRecurrenceId: taskRecurrence.id,
          });
          const task = await storage.createTask(taskWithRecurrence);
          createdTasks.push(task);
        }
        
        res.json({ 
          message: `Created ${createdTasks.length} recurring tasks`,
          tasks: createdTasks,
          recurrence: taskRecurrence
        });
      } else {
        // Handle single task creation
        const taskData = insertTaskSchema.parse({
          ...formData,
          workspaceId,
        });
        
        const task = await storage.createTask(taskData);
        res.json(task);
      }
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.patch('/api/tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const updates = req.body;
      
      const originalTask = await storage.getTaskById(taskId);
      const task = await storage.updateTask(taskId, updates);
      
      // Handle notifications for task updates
      if (originalTask) {
        // Check if task was assigned to someone new
        if (updates.assignedMemberId && updates.assignedMemberId !== originalTask.assignedMemberId) {
          const member = await storage.getWorkspaceMembers(originalTask.workspaceId);
          const assignedMember = member.find(m => m.id === updates.assignedMemberId);
          if (assignedMember && assignedMember.userId) {
            const assignedUser = await storage.getUser(assignedMember.userId);
            if (assignedUser) {
              await createTaskNotification({
                type: 'task_assigned',
                userId: assignedMember.userId,
                workspaceId: originalTask.workspaceId,
                taskId: taskId,
                title: 'New Task Assigned',
                message: `You have been assigned to task: ${task.title}`,
                assignedUser,
                task
              });
            }
          }
        }
        
        // Check if task status changed
        if (updates.status && updates.status !== originalTask.status) {
          const statusMessages = {
            'todo': 'moved to Todo',
            'in_progress': 'started working on',
            'review': 'moved to Review',
            'completed': 'completed'
          };
          
          const statusMessage = statusMessages[updates.status as keyof typeof statusMessages] || 'updated the status of';
          
          // Determine who to notify based on task assignment and project involvement
          const usersToNotify = new Set<string>();
          
          // Always notify the assigned user (if different from the one making the change)
          if (originalTask.assignedMemberId) {
            const members = await storage.getWorkspaceMembers(originalTask.workspaceId);
            const assignedMember = members.find(m => m.id === originalTask.assignedMemberId);
            if (assignedMember && assignedMember.userId && assignedMember.userId !== req.user.id) {
              usersToNotify.add(assignedMember.userId);
            }
          }
          
          // Also notify workspace owner/admin for oversight
          const workspace = await storage.getWorkspaceById(originalTask.workspaceId);
          if (workspace && workspace.ownerId && workspace.ownerId !== req.user.id) {
            usersToNotify.add(workspace.ownerId);
          }
          
          // For completion status, also notify project-involved users
          if (updates.status === 'completed' && originalTask.projectId) {
            const involvedUsers = await getProjectInvolvedUsers(originalTask.projectId, originalTask.workspaceId);
            for (const { member } of involvedUsers) {
              if (member.userId && member.userId !== req.user.id) {
                usersToNotify.add(member.userId);
              }
            }
          }
          
          // Send notifications to all relevant users
          for (const userId of Array.from(usersToNotify)) {
            const user = await storage.getUser(userId);
            if (user) {
              await createTaskNotification({
                type: updates.status === 'completed' ? 'task_completed' : 'task_status_changed',
                userId: userId,
                workspaceId: originalTask.workspaceId,
                taskId: taskId,
                title: `Task Status Changed`,
                message: `${req.user.firstName || 'Someone'} ${statusMessage} task: "${task.title}"`,
                assignedUser: user,
                task,
                statusChange: {
                  from: originalTask.status || 'todo',
                  to: updates.status
                }
              });
            }
          }
        }
      }
      
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.delete('/api/tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.id);
      await storage.deleteTask(taskId);
      res.json({ message: "Task deleted successfully" });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Task recurrence routes
  app.get('/api/workspaces/:id/task-recurrences', isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.id);
      const recurrences = await storage.getWorkspaceTaskRecurrences(workspaceId);
      res.json(recurrences);
    } catch (error) {
      console.error("Error fetching task recurrences:", error);
      res.status(500).json({ message: "Failed to fetch task recurrences" });
    }
  });

  app.get('/api/task-recurrences/:id', isAuthenticated, async (req: any, res) => {
    try {
      const recurrenceId = parseInt(req.params.id);
      const recurrence = await storage.getTaskRecurrenceById(recurrenceId);
      
      if (!recurrence) {
        return res.status(404).json({ message: "Task recurrence not found" });
      }
      
      res.json(recurrence);
    } catch (error) {
      console.error("Error fetching task recurrence:", error);
      res.status(500).json({ message: "Failed to fetch task recurrence" });
    }
  });

  app.patch('/api/task-recurrences/:id', isAuthenticated, async (req: any, res) => {
    try {
      const recurrenceId = parseInt(req.params.id);
      const updates = req.body;
      
      const recurrence = await storage.updateTaskRecurrence(recurrenceId, updates);
      res.json(recurrence);
    } catch (error) {
      console.error("Error updating task recurrence:", error);
      res.status(500).json({ message: "Failed to update task recurrence" });
    }
  });

  app.delete('/api/task-recurrences/:id', isAuthenticated, async (req: any, res) => {
    try {
      const recurrenceId = parseInt(req.params.id);
      const today = new Date().toISOString().split('T')[0];
      
      // Find all tasks associated with this recurrence
      const allTasks = await storage.getTasksByRecurrenceId(recurrenceId);
      
      // Filter to only delete current and future tasks (not past ones)
      const tasksToDelete = allTasks.filter(task => 
        !task.dueDate || task.dueDate >= today
      );
      
      // Delete only current and future task instances
      for (const task of tasksToDelete) {
        await storage.deleteTask(task.id);
      }
      
      // Delete the recurrence record
      await storage.deleteTaskRecurrence(recurrenceId);
      
      res.json({ 
        message: `Task recurrence and ${tasksToDelete.length} future tasks deleted successfully`,
        deletedTasksCount: tasksToDelete.length,
        totalTasksInSeries: allTasks.length
      });
    } catch (error) {
      console.error("Error deleting task recurrence:", error);
      res.status(500).json({ message: "Failed to delete task recurrence" });
    }
  });

  // Project pages routes
  app.get('/api/projects/:id/pages', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const pages = await storage.getProjectPages(projectId);
      res.json(pages);
    } catch (error) {
      console.error("Error fetching project pages:", error);
      res.status(500).json({ message: "Failed to fetch project pages" });
    }
  });

  app.post('/api/projects/:id/pages', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const pageData = insertProjectPageSchema.parse({
        ...req.body,
        projectId,
      });
      
      const page = await storage.createProjectPage(pageData);
      res.json(page);
    } catch (error) {
      console.error("Error creating project page:", error);
      res.status(500).json({ message: "Failed to create project page" });
    }
  });

  // Brain dump routes
  app.get('/api/workspaces/:id/brain-dump', isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const items = await storage.getUserBrainDumpItems(workspaceId, userId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching brain dump items:", error);
      res.status(500).json({ message: "Failed to fetch brain dump items" });
    }
  });

  app.post('/api/workspaces/:id/brain-dump', isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const itemData = insertBrainDumpItemSchema.parse({
        ...req.body,
        workspaceId,
        userId,
      });
      
      const item = await storage.createBrainDumpItem(itemData);
      res.json(item);
    } catch (error) {
      console.error("Error creating brain dump item:", error);
      res.status(500).json({ message: "Failed to create brain dump item" });
    }
  });

  app.delete('/api/brain-dump/:id', isAuthenticated, async (req: any, res) => {
    try {
      const itemId = parseInt(req.params.id);
      await storage.deleteBrainDumpItem(itemId);
      res.json({ message: "Brain dump item deleted successfully" });
    } catch (error) {
      console.error("Error deleting brain dump item:", error);
      res.status(500).json({ message: "Failed to delete brain dump item" });
    }
  });

  app.delete('/api/workspaces/:id/brain-dump', isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      await storage.clearUserBrainDump(workspaceId, userId);
      res.json({ message: "Brain dump cleared successfully" });
    } catch (error) {
      console.error("Error clearing brain dump:", error);
      res.status(500).json({ message: "Failed to clear brain dump" });
    }
  });



  // AI Chat routes - enhanced with conversation management
  app.get('/api/workspaces/:id/chat', isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.id);
      const conversations = await storage.getWorkspaceChatHistory(workspaceId, 20);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching chat history:", error);
      res.status(500).json({ message: "Failed to fetch chat history" });
    }
  });

  // Get all conversations for a workspace
  app.get('/api/workspaces/:id/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.id);
      const userId = req.user?.id || req.user?.claims?.sub || req.user?.sub || req.user?.userId;
      const conversations = await storage.getWorkspaceConversations(workspaceId, userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  // Get messages for a specific conversation
  app.get('/api/workspaces/:id/conversations/:conversationId/messages', isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.id);
      const { conversationId } = req.params;
      const messages = await storage.getConversationMessages(workspaceId, conversationId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching conversation messages:", error);
      res.status(500).json({ message: "Failed to fetch conversation messages" });
    }
  });

  app.post('/api/workspaces/:id/chat', isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.id);
      const userId = req.user?.id || req.user?.claims?.sub || req.user?.sub || req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const { message, conversationId } = req.body;

      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      // Generate conversation ID if not provided (new conversation)
      const finalConversationId = conversationId || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Get context for AI including user-specific data
      const [tasks, projects, categories, user, userTasks, userActivity] = await Promise.all([
        storage.getWorkspaceTasks(workspaceId),
        storage.getWorkspaceProjects(workspaceId),
        storage.getWorkspaceCategories(workspaceId),
        storage.getUser(userId),
        storage.getUserTasks(userId, workspaceId),
        buildActivityContext(userId, workspaceId),
      ]);

      // Process AI query with enhanced user context
      const response = await processAIQuery(message, {
        workspaceId,
        userId,
        user: {
          id: userId,
          name: user?.firstName || user?.lastName ? `${user.firstName} ${user.lastName}`.trim() : user?.email?.split('@')[0] || 'User',
          email: user?.email || undefined,
        },
        recentTasks: tasks.slice(0, 10),
        userTasks: userTasks.slice(0, 10), // User's specific tasks
        projects,
        categories,
        recentActivity: userActivity,
      });

      // Save conversation
      const conversationData = insertChatConversationSchema.parse({
        workspaceId,
        userId,
        conversationId: finalConversationId,
        message,
        response,
      });

      const conversation = await storage.createChatConversation(conversationData);
      res.json(conversation);
    } catch (error) {
      console.error("Error processing chat message:", error);
      res.status(500).json({ message: "Failed to process chat message" });
    }
  });

  // Update conversation title
  app.patch('/api/workspaces/:id/conversations/:conversationId', isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.id);
      const { conversationId } = req.params;
      const { title } = req.body;

      if (!title || typeof title !== 'string') {
        return res.status(400).json({ message: "Title is required" });
      }

      await storage.updateConversationTitle(workspaceId, conversationId, title);
      res.json({ message: "Conversation title updated successfully" });
    } catch (error) {
      console.error("Error updating conversation title:", error);
      res.status(500).json({ message: "Failed to update conversation title" });
    }
  });

  // Delete conversation
  app.delete('/api/workspaces/:id/conversations/:conversationId', isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.id);
      const { conversationId } = req.params;

      await storage.deleteConversation(workspaceId, conversationId);
      res.json({ message: "Conversation deleted successfully" });
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ message: "Failed to delete conversation" });
    }
  });

  // AI Task suggestions
  app.post('/api/projects/:id/ai-suggestions', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const existingTasks = await storage.getProjectTasks(projectId);
      
      const suggestions = await generateTaskSuggestions({
        projectName: project.name,
        existingTasks,
        budget: project.budget ? parseFloat(project.budget) : undefined,
      });

      res.json({ suggestions });
    } catch (error) {
      console.error("Error generating task suggestions:", error);
      res.status(500).json({ message: "Failed to generate task suggestions" });
    }
  });

  // AI Project insights
  app.get('/api/projects/:id/insights', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const tasks = await storage.getProjectTasks(projectId);
      
      const insights = await generateProjectInsights({
        name: project.name,
        tasks,
        budget: project.budget ? parseFloat(project.budget) : undefined,
        spent: project.spent ? parseFloat(project.spent) : undefined,
      });

      res.json({ insights });
    } catch (error) {
      console.error("Error generating project insights:", error);
      res.status(500).json({ message: "Failed to generate project insights" });
    }
  });

  // Notification routes
  app.get('/api/workspaces/:id/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.id);
      const notifications = await storage.getUserNotifications(req.user.id, workspaceId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get('/api/workspaces/:id/notifications/unread-count', isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.id);
      const count = await storage.getUnreadNotificationCount(req.user.id, workspaceId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread notification count:", error);
      res.status(500).json({ message: "Failed to fetch unread notification count" });
    }
  });

  app.patch('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      await storage.markNotificationAsRead(notificationId);
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.patch('/api/workspaces/:id/notifications/mark-all-read', isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.id);
      await storage.markAllNotificationsAsRead(req.user.id, workspaceId);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  // Task comment routes
  app.get('/api/tasks/:id/comments', isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const comments = await storage.getTaskComments(taskId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching task comments:", error);
      res.status(500).json({ message: "Failed to fetch task comments" });
    }
  });

  app.post('/api/tasks/:id/comments', isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const { comment, workspaceId, taggedUserIds = [] } = req.body || {};
      
      // Fix user ID retrieval - handle different user object structures
      const userId = req.user?.id || req.user?.claims?.sub || req.user?.sub || req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const commentData = {
        taskId,
        userId: userId,
        workspaceId: parseInt(workspaceId),
        comment: String(comment || '').trim(),
      };
      
      if (!commentData.comment) {
        return res.status(400).json({ message: 'Comment text is required' });
      }
      
      if (!commentData.workspaceId) {
        return res.status(400).json({ message: 'Workspace ID is required' });
      }
      
      const newComment = await storage.createTaskComment(commentData);
      
      // Get task details for notification
      const task = await storage.getTaskById(taskId);
      if (task && task.projectId) {
        let usersToNotify = [];
        
        // If there are tagged users, notify only them (and workspace owner for oversight)
        if (taggedUserIds && taggedUserIds.length > 0) {
          const workspace = await storage.getWorkspaceById(workspaceId);
          const workspaceMembers = await storage.getWorkspaceMembers(workspaceId);
          
          for (const taggedUserId of taggedUserIds) {
            const member = workspaceMembers.find(m => m.userId === taggedUserId);
            if (member && member.userId !== userId) {
              const user = await storage.getUser(member.userId);
              if (user) {
                usersToNotify.push({ member, user });
              }
            }
          }
          
          // Always include workspace owner for oversight (if not already included)
          if (workspace && workspace.ownerId !== userId) {
            const ownerMember = workspaceMembers.find(m => m.userId === workspace.ownerId);
            if (ownerMember && !usersToNotify.find(u => u.member.userId === workspace.ownerId)) {
              const ownerUser = await storage.getUser(workspace.ownerId);
              if (ownerUser) {
                usersToNotify.push({ member: ownerMember, user: ownerUser });
              }
            }
          }
        } else {
          // No tagged users - fall back to existing project-involved users workflow
          usersToNotify = await getProjectInvolvedUsers(task.projectId, workspaceId);
        }
        
        // Send notifications to determined users
        for (const { member, user } of usersToNotify) {
          if (member.userId && member.userId !== userId) {
            await createTaskNotification({
              type: 'comment_added',
              userId: member.userId,
              workspaceId: workspaceId,
              taskId: taskId,
              title: 'New Comment on Task',
              message: `${req.user.firstName || 'Someone'} added a comment to task: ${task.title}`,
              assignedUser: user,
              task,
              commenterName: req.user.firstName || req.user.email?.split('@')[0] || 'Someone',
              commentText: comment
            });
          }
        }
      }
      
      res.json(newComment);
    } catch (error) {
      console.error("Error creating task comment:", error);
      res.status(500).json({ message: "Failed to create task comment" });
    }
  });

  app.delete('/api/comments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const commentId = parseInt(req.params.id);
      await storage.deleteTaskComment(commentId);
      res.json({ message: "Comment deleted successfully" });
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ message: "Failed to delete comment" });
    }
  });

  // File Management API endpoints for Vault
  app.get('/api/workspaces/:workspaceId/files', isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);
      const files = await storage.getWorkspaceFiles(workspaceId);
      res.json(files);
    } catch (error) {
      console.error("Error fetching workspace files:", error);
      res.status(500).json({ message: "Failed to fetch files" });
    }
  });

  app.get('/api/workspaces/:workspaceId/files/recent', isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);
      const files = await storage.getWorkspaceFiles(workspaceId);
      // Return the 10 most recently created files
      const recentFiles = files
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 10);
      res.json(recentFiles);
    } catch (error) {
      console.error("Error fetching recent files:", error);
      res.status(500).json({ message: "Failed to fetch recent files" });
    }
  });

  app.get('/api/projects/:projectId/files', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const files = await storage.getProjectFiles(projectId);
      res.json(files);
    } catch (error) {
      console.error("Error fetching project files:", error);
      res.status(500).json({ message: "Failed to fetch project files" });
    }
  });

  app.post('/api/workspaces/:workspaceId/files/upload', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);
      const { projectId, parentId } = req.body;
      
      // For now, we'll simulate file upload by creating file records
      // In a real implementation, you'd handle actual file uploads to cloud storage
      const file = req.file || req.files?.[0];
      if (!file) {
        return res.status(400).json({ message: "No file provided" });
      }

      const userId = req.user.claims?.sub || req.user.id;
      const fileName = file.originalname || file.name;
      
      const fileData = {
        name: fileName,
        originalName: fileName,
        mimeType: file.mimetype || 'application/octet-stream',
        size: file.size || 0,
        path: `/uploads/${workspaceId}/${Date.now()}-${fileName}`,
        workspaceId,
        projectId: projectId ? parseInt(projectId) : null,
        uploadedBy: userId
      };

      const newFile = await storage.createFile(fileData);
      res.json(newFile);
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  app.post('/api/workspaces/:workspaceId/files/folder', isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);
      const { name, projectId, parentId } = req.body;

      if (!name) {
        return res.status(400).json({ message: "Folder name is required" });
      }

      const userId = req.user.claims?.sub || req.user.id;
      
      const folderData = {
        name,
        originalName: name,
        mimeType: 'application/folder',
        size: 0,
        path: `/${name}`,
        workspaceId,
        projectId: projectId ? parseInt(projectId) : null,
        uploadedBy: userId
      };

      const newFolder = await storage.createFile(folderData);
      res.json(newFolder);
    } catch (error) {
      console.error("Error creating folder:", error);
      res.status(500).json({ message: "Failed to create folder" });
    }
  });

  app.delete('/api/workspaces/:workspaceId/files/:fileId', isAuthenticated, async (req: any, res) => {
    try {
      const fileId = parseInt(req.params.fileId);
      await storage.deleteFile(fileId);
      res.json({ message: "File deleted successfully" });
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({ message: "Failed to delete file" });
    }
  });

  app.patch('/api/workspaces/:workspaceId/files/:fileId', isAuthenticated, async (req: any, res) => {
    try {
      const fileId = parseInt(req.params.fileId);
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({ message: "New name is required" });
      }

      // For now, we'll implement a simple rename by updating the name field
      // In a real implementation, you'd also update the file path and handle file system changes
      const updatedFile = await storage.updateFile(fileId, { name });
      res.json(updatedFile);
    } catch (error) {
      console.error("Error renaming file:", error);
      res.status(500).json({ message: "Failed to rename file" });
    }
  });

  // Project Components API Routes
  app.get('/api/projects/:projectId/components', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const components = await storage.getProjectComponents(projectId);
      res.json(components);
    } catch (error) {
      console.error("Error fetching project components:", error);
      res.status(500).json({ message: "Failed to fetch components" });
    }
  });

  app.post('/api/projects/:projectId/components', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const parsed = insertProjectComponentSchema.parse({ ...req.body, projectId });
      const component = await storage.createProjectComponent(parsed);
      res.json(component);
    } catch (error) {
      console.error("Error creating component:", error);
      res.status(400).json({ message: "Failed to create component" });
    }
  });

  app.patch('/api/projects/:projectId/components/:componentId', isAuthenticated, async (req: any, res) => {
    try {
      const componentId = parseInt(req.params.componentId);
      const updates = req.body;
      const component = await storage.updateProjectComponent(componentId, updates);
      res.json(component);
    } catch (error) {
      console.error("Error updating component:", error);
      res.status(400).json({ message: "Failed to update component" });
    }
  });

  app.delete('/api/projects/:projectId/components/:componentId', isAuthenticated, async (req: any, res) => {
    try {
      const componentId = parseInt(req.params.componentId);
      await storage.deleteProjectComponent(componentId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting component:", error);
      res.status(400).json({ message: "Failed to delete component" });
    }
  });

  // Financial API Routes
  // Budget Management
  app.get('/api/projects/:projectId/budgets', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const budgets = await storage.getProjectBudgets(projectId);
      res.json(budgets);
    } catch (error) {
      console.error("Error fetching project budgets:", error);
      res.status(500).json({ message: "Failed to fetch budgets" });
    }
  });

  app.post('/api/projects/:projectId/budgets', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const parsed = insertProjectBudgetSchema.parse({ ...req.body, projectId });
      const budget = await storage.createProjectBudget(parsed);
      res.json(budget);
    } catch (error) {
      console.error("Error creating budget:", error);
      res.status(400).json({ message: "Failed to create budget" });
    }
  });

  app.patch('/api/projects/:projectId/budgets/:budgetId', isAuthenticated, async (req: any, res) => {
    try {
      const budgetId = parseInt(req.params.budgetId);
      const updates = req.body;
      const budget = await storage.updateProjectBudget(budgetId, updates);
      res.json(budget);
    } catch (error) {
      console.error("Error updating budget:", error);
      res.status(400).json({ message: "Failed to update budget" });
    }
  });

  app.delete('/api/projects/:projectId/budgets/:budgetId', isAuthenticated, async (req: any, res) => {
    try {
      const budgetId = parseInt(req.params.budgetId);
      await storage.deleteProjectBudget(budgetId);
      res.json({ message: "Budget deleted successfully" });
    } catch (error) {
      console.error("Error deleting budget:", error);
      res.status(500).json({ message: "Failed to delete budget" });
    }
  });

  // Expense Management
  app.get('/api/projects/:projectId/expenses', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const expenses = await storage.getProjectExpenses(projectId);
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching project expenses:", error);
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.post('/api/projects/:projectId/expenses', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const userId = req.user.claims?.sub || req.user.id;
      const parsed = insertProjectExpenseSchema.parse({ ...req.body, projectId, createdBy: userId });
      const expense = await storage.createProjectExpense(parsed);
      res.json(expense);
    } catch (error) {
      console.error("Error creating expense:", error);
      res.status(400).json({ message: "Failed to create expense" });
    }
  });

  app.patch('/api/projects/:projectId/expenses/:expenseId', isAuthenticated, async (req: any, res) => {
    try {
      const expenseId = parseInt(req.params.expenseId);
      const updates = req.body;
      const expense = await storage.updateProjectExpense(expenseId, updates);
      res.json(expense);
    } catch (error) {
      console.error("Error updating expense:", error);
      res.status(400).json({ message: "Failed to update expense" });
    }
  });

  app.delete('/api/projects/:projectId/expenses/:expenseId', isAuthenticated, async (req: any, res) => {
    try {
      const expenseId = parseInt(req.params.expenseId);
      await storage.deleteProjectExpense(expenseId);
      res.json({ message: "Expense deleted successfully" });
    } catch (error) {
      console.error("Error deleting expense:", error);
      res.status(500).json({ message: "Failed to delete expense" });
    }
  });

  // Revenue Management
  app.get('/api/projects/:projectId/revenue', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const revenue = await storage.getProjectRevenue(projectId);
      res.json(revenue);
    } catch (error) {
      console.error("Error fetching project revenue:", error);
      res.status(500).json({ message: "Failed to fetch revenue" });
    }
  });

  app.post('/api/projects/:projectId/revenue', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const userId = req.user.claims?.sub || req.user.id;
      const parsed = insertProjectRevenueSchema.parse({ ...req.body, projectId, createdBy: userId });
      const revenue = await storage.createProjectRevenue(parsed);
      res.json(revenue);
    } catch (error) {
      console.error("Error creating revenue:", error);
      res.status(400).json({ message: "Failed to create revenue" });
    }
  });

  app.patch('/api/projects/:projectId/revenue/:revenueId', isAuthenticated, async (req: any, res) => {
    try {
      const revenueId = parseInt(req.params.revenueId);
      const updates = req.body;
      const revenue = await storage.updateProjectRevenue(revenueId, updates);
      res.json(revenue);
    } catch (error) {
      console.error("Error updating revenue:", error);
      res.status(400).json({ message: "Failed to update revenue" });
    }
  });

  app.delete('/api/projects/:projectId/revenue/:revenueId', isAuthenticated, async (req: any, res) => {
    try {
      const revenueId = parseInt(req.params.revenueId);
      await storage.deleteProjectRevenue(revenueId);
      res.json({ message: "Revenue deleted successfully" });
    } catch (error) {
      console.error("Error deleting revenue:", error);
      res.status(500).json({ message: "Failed to delete revenue" });
    }
  });

  // Outflow Types API Routes
  app.get('/api/projects/:projectId/outflow-types', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const outflowTypes = await storage.getProjectOutflowTypes(projectId);
      res.json(outflowTypes);
    } catch (error) {
      console.error("Error fetching outflow types:", error);
      res.status(500).json({ message: "Failed to fetch outflow types" });
    }
  });

  app.post('/api/projects/:projectId/outflow-types', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      // Get the project to retrieve workspaceId
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      const parsed = insertOutflowTypeSchema.parse({ ...req.body, projectId, workspaceId: project.workspaceId });
      const outflowType = await storage.createOutflowType(parsed);
      res.json(outflowType);
    } catch (error) {
      console.error("Error creating outflow type:", error);
      res.status(400).json({ message: "Failed to create outflow type" });
    }
  });

  app.patch('/api/projects/:projectId/outflow-types/:typeId', isAuthenticated, async (req: any, res) => {
    try {
      const typeId = parseInt(req.params.typeId);
      const updates = req.body;
      const outflowType = await storage.updateOutflowType(typeId, updates);
      res.json(outflowType);
    } catch (error) {
      console.error("Error updating outflow type:", error);
      res.status(400).json({ message: "Failed to update outflow type" });
    }
  });

  app.delete('/api/projects/:projectId/outflow-types/:typeId', isAuthenticated, async (req: any, res) => {
    try {
      const typeId = parseInt(req.params.typeId);
      await storage.deleteOutflowType(typeId);
      res.json({ message: "Outflow type deleted successfully" });
    } catch (error) {
      console.error("Error deleting outflow type:", error);
      res.status(500).json({ message: "Failed to delete outflow type" });
    }
  });

  // Inflow Types API Routes
  app.get('/api/projects/:projectId/inflow-types', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const inflowTypes = await storage.getProjectInflowTypes(projectId);
      res.json(inflowTypes);
    } catch (error) {
      console.error("Error fetching inflow types:", error);
      res.status(500).json({ message: "Failed to fetch inflow types" });
    }
  });

  app.post('/api/projects/:projectId/inflow-types', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      // Get the project to retrieve workspaceId
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      const parsed = insertInflowTypeSchema.parse({ ...req.body, projectId, workspaceId: project.workspaceId });
      const inflowType = await storage.createInflowType(parsed);
      res.json(inflowType);
    } catch (error) {
      console.error("Error creating inflow type:", error);
      res.status(400).json({ message: "Failed to create inflow type" });
    }
  });

  app.patch('/api/projects/:projectId/inflow-types/:typeId', isAuthenticated, async (req: any, res) => {
    try {
      const typeId = parseInt(req.params.typeId);
      const updates = req.body;
      const inflowType = await storage.updateInflowType(typeId, updates);
      res.json(inflowType);
    } catch (error) {
      console.error("Error updating inflow type:", error);
      res.status(400).json({ message: "Failed to update inflow type" });
    }
  });

  app.delete('/api/projects/:projectId/inflow-types/:typeId', isAuthenticated, async (req: any, res) => {
    try {
      const typeId = parseInt(req.params.typeId);
      await storage.deleteInflowType(typeId);
      res.json({ message: "Inflow type deleted successfully" });
    } catch (error) {
      console.error("Error deleting inflow type:", error);
      res.status(500).json({ message: "Failed to delete inflow type" });
    }
  });

  // Seed default types for existing workspace
  app.post('/api/workspaces/:workspaceId/seed-default-types', isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);
      await storage.seedDefaultTypesForWorkspace(workspaceId);
      res.json({ message: "Default types seeded successfully" });
    } catch (error) {
      console.error("Error seeding default types:", error);
      res.status(500).json({ message: "Failed to seed default types" });
    }
  });

  // Personalized AI insights endpoint
  app.get('/api/ai/personalized-insights', isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = req.query.workspaceId ? parseInt(req.query.workspaceId as string) : null;
      
      if (!workspaceId || isNaN(workspaceId)) {
        return res.status(400).json({ error: 'Workspace ID is required' });
      }

      const { generatePersonalizedInsights } = await import("./openai");
      
      // Simplified access check - if user is authenticated and workspace exists, allow access
      const workspace = await storage.getWorkspaceById(workspaceId);
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }

      // Get workspace data for context
      const allTasks = await storage.getWorkspaceTasks(workspaceId);
      const allMembers = await storage.getWorkspaceMembers(workspaceId);
      
      const userMember = allMembers.find((m: any) => m.userId === req.user.id);

      const userTasks = userMember ? allTasks.filter((task: any) => task.assignedMemberId === userMember.id) : [];
      const projects = await storage.getWorkspaceProjects(workspaceId);
      const categories = await storage.getWorkspaceCategories(workspaceId);
      
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const context = {
        workspaceId,
        userId: userId,
        user: {
          id: userId,
          name: user?.firstName || user?.email?.split('@')[0] || 'User',
          email: user?.email || undefined
        },
        userTasks,
        projects,
        categories
      };

      const insights = await generatePersonalizedInsights(context);
      
      res.json(insights);
    } catch (error) {
      console.error('AI personalized insights error:', error);
      res.status(500).json({ error: 'Failed to generate personalized insights' });
    }
  });

  // Activity tracking API routes
  app.get('/api/workspaces/:workspaceId/activities', isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);
      const limit = parseInt(req.query.limit) || 50;
      
      const activities = await storage.getWorkspaceActivities(workspaceId, limit);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching workspace activities:", error);
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  app.get('/api/users/:userId/activities', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.params.userId;
      const limit = parseInt(req.query.limit) || 50;
      const hours = parseInt(req.query.hours) || 24;
      
      // Only allow users to access their own activities or if they're workspace admin
      if (req.user.id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const activities = req.query.recent === 'true' 
        ? await storage.getRecentUserActivities(userId, hours)
        : await storage.getUserActivities(userId, limit);
        
      res.json(activities);
    } catch (error) {
      console.error("Error fetching user activities:", error);
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  // Global Search Endpoint
  app.get('/api/search', isAuthenticated, async (req: any, res) => {
    try {
      const { workspaceId, q: searchQuery } = req.query;
      
      if (!workspaceId || !searchQuery || searchQuery.length < 2) {
        return res.json({ tasks: [], projects: [], members: [], categories: [] });
      }

      const query = searchQuery.toLowerCase().trim();
      
      // Search tasks
      const allTasks = await storage.getWorkspaceTasks(parseInt(workspaceId));
      const tasks = allTasks.filter(task => 
        task.title.toLowerCase().includes(query) ||
        (task.description && task.description.toLowerCase().includes(query))
      ).slice(0, 10); // Limit to 10 results

      // Search projects
      const allProjects = await storage.getWorkspaceProjects(parseInt(workspaceId));
      const projects = allProjects.filter(project =>
        project.name.toLowerCase().includes(query) ||
        (project.description && project.description.toLowerCase().includes(query))
      ).slice(0, 10);

      // Search members
      const allMembers = await storage.getWorkspaceMembers(parseInt(workspaceId));
      const members = allMembers.filter(member => {
        const name = (member.name || '').toLowerCase();
        const email = (member.email || '').toLowerCase();
        
        return name.includes(query) || email.includes(query);
      }).slice(0, 10);

      // Search categories
      const allCategories = await storage.getWorkspaceCategories(parseInt(workspaceId));
      const categories = allCategories.filter(category =>
        category.name.toLowerCase().includes(query)
      ).slice(0, 10);

      res.json({
        tasks,
        projects,
        members,
        categories
      });
    } catch (error) {
      console.error("Error performing global search:", error);
      res.status(500).json({ message: "Search failed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
