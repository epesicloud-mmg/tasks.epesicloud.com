import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { InsertActivityLog } from "@shared/schema";

// Extended Request interface with activity logging
export interface ActivityRequest extends Request {
  logActivity?: (data: Partial<InsertActivityLog>) => Promise<void>;
}

// Activity mapping for different HTTP methods and routes
const getActivityAction = (method: string, path: string): string => {
  const normalizedPath = path.toLowerCase();
  
  // Task-related activities
  if (normalizedPath.includes('/tasks')) {
    switch (method) {
      case 'POST': return 'created';
      case 'PATCH': return 'updated';
      case 'DELETE': return 'deleted';
      case 'GET': return normalizedPath.includes('/due-today') ? 'viewed_due_tasks' : 'viewed';
      default: return 'accessed';
    }
  }
  
  // Project-related activities
  if (normalizedPath.includes('/projects')) {
    switch (method) {
      case 'POST': return 'created';
      case 'PATCH': return 'updated';
      case 'DELETE': return 'deleted';
      case 'GET': return 'viewed';
      default: return 'accessed';
    }
  }
  
  // Workspace-related activities
  if (normalizedPath.includes('/workspaces')) {
    switch (method) {
      case 'POST': return 'created';
      case 'PATCH': return 'updated';
      case 'DELETE': return 'deleted';
      case 'GET': return 'viewed';
      default: return 'accessed';
    }
  }
  
  // Chat activities
  if (normalizedPath.includes('/chat')) {
    switch (method) {
      case 'POST': return 'chatted';
      case 'GET': return 'viewed_chat';
      default: return 'accessed_chat';
    }
  }
  
  // File activities
  if (normalizedPath.includes('/files')) {
    switch (method) {
      case 'POST': return 'uploaded';
      case 'DELETE': return 'deleted';
      case 'GET': return 'downloaded';
      default: return 'accessed';
    }
  }
  
  // Comment activities
  if (normalizedPath.includes('/comments')) {
    switch (method) {
      case 'POST': return 'commented';
      case 'PATCH': return 'updated_comment';
      case 'DELETE': return 'deleted_comment';
      case 'GET': return 'viewed_comments';
      default: return 'accessed';
    }
  }
  
  // Member activities
  if (normalizedPath.includes('/members')) {
    switch (method) {
      case 'POST': return 'invited_member';
      case 'DELETE': return 'removed_member';
      case 'GET': return 'viewed_members';
      default: return 'accessed';
    }
  }
  
  // Category activities
  if (normalizedPath.includes('/categories')) {
    switch (method) {
      case 'POST': return 'created';
      case 'PATCH': return 'updated';
      case 'DELETE': return 'deleted';
      case 'GET': return 'viewed';
      default: return 'accessed';
    }
  }
  
  // Financial activities
  if (normalizedPath.includes('/inflows') || normalizedPath.includes('/outflows') || 
      normalizedPath.includes('/budgets') || normalizedPath.includes('/components')) {
    switch (method) {
      case 'POST': return 'created';
      case 'PATCH': return 'updated';
      case 'DELETE': return 'deleted';
      case 'GET': return 'viewed';
      default: return 'accessed';
    }
  }
  
  // Notification activities
  if (normalizedPath.includes('/notifications')) {
    switch (method) {
      case 'PATCH': return 'marked_read';
      case 'GET': return 'viewed_notifications';
      default: return 'accessed';
    }
  }
  
  // Brain dump activities
  if (normalizedPath.includes('/brain-dump')) {
    switch (method) {
      case 'POST': return 'created_note';
      case 'PATCH': return 'updated_note';
      case 'DELETE': return 'deleted_note';
      case 'GET': return 'viewed_notes';
      default: return 'accessed';
    }
  }
  
  // Default activity mapping
  switch (method) {
    case 'POST': return 'created';
    case 'PATCH': return 'updated';
    case 'DELETE': return 'deleted';
    case 'GET': return 'viewed';
    default: return 'accessed';
  }
};

// Extract entity type from path
const getEntityType = (path: string): string => {
  const normalizedPath = path.toLowerCase();
  
  if (normalizedPath.includes('/tasks')) return 'task';
  if (normalizedPath.includes('/projects')) return 'project';
  if (normalizedPath.includes('/workspaces')) return 'workspace';
  if (normalizedPath.includes('/chat')) return 'chat';
  if (normalizedPath.includes('/files')) return 'file';
  if (normalizedPath.includes('/comments')) return 'comment';
  if (normalizedPath.includes('/members')) return 'member';
  if (normalizedPath.includes('/categories')) return 'category';
  if (normalizedPath.includes('/inflows')) return 'inflow';
  if (normalizedPath.includes('/outflows')) return 'outflow';
  if (normalizedPath.includes('/budgets')) return 'budget';
  if (normalizedPath.includes('/components')) return 'component';
  if (normalizedPath.includes('/notifications')) return 'notification';
  if (normalizedPath.includes('/brain-dump')) return 'brain_dump';
  
  return 'unknown';
};

// Extract workspace ID from path
const extractWorkspaceId = (path: string): number | null => {
  const match = path.match(/\/workspaces\/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
};

// Extract entity ID from path (for specific resources)
const extractEntityId = (path: string): number | null => {
  // Look for ID at the end of path segments
  const segments = path.split('/');
  for (let i = segments.length - 1; i >= 0; i--) {
    const segment = segments[i];
    if (/^\d+$/.test(segment)) {
      return parseInt(segment, 10);
    }
  }
  return null;
};

// Extract entity name from request body or response
const extractEntityName = (req: Request, res: Response): string | null => {
  // Try to get name from request body
  if (req.body) {
    const body = req.body;
    if (body.name) return body.name;
    if (body.title) return body.title;
    if (body.message) return body.message.substring(0, 50) + (body.message.length > 50 ? '...' : '');
    if (body.fileName) return body.fileName;
  }
  
  return null;
};

// Activity logging middleware
export const activityLogger = (req: ActivityRequest, res: Response, next: NextFunction) => {
  // Skip logging for certain routes
  const skipRoutes = [
    '/api/auth',
    '/api/workspaces/notifications/unread-count',
    '/health',
    '/favicon.ico'
  ];
  
  const shouldSkip = skipRoutes.some(route => req.path.startsWith(route));
  if (shouldSkip || req.method === 'OPTIONS') {
    return next();
  }
  
  // Add activity logging function to request
  req.logActivity = async (data: Partial<InsertActivityLog>) => {
    try {
      const userId = req.user?.id;
      if (!userId) return; // Skip if user not authenticated
      
      const workspaceId = data.workspaceId || extractWorkspaceId(req.path);
      const action = data.action || getActivityAction(req.method, req.path);
      const entityType = data.entityType || getEntityType(req.path);
      const entityId = data.entityId || extractEntityId(req.path);
      const entityName = data.entityName || extractEntityName(req, res);
      
      const activityData: InsertActivityLog = {
        userId,
        workspaceId,
        action,
        entityType,
        entityId,
        entityName,
        details: data.details || {
          method: req.method,
          path: req.path,
          userAgent: req.get('User-Agent'),
          ip: req.ip || req.connection.remoteAddress,
          timestamp: new Date().toISOString()
        },
        metadata: data.metadata || {
          requestId: req.get('X-Request-ID'),
          referer: req.get('Referer')
        }
      };
      
      await storage.logActivity(activityData);
    } catch (error) {
      console.error('Failed to log activity:', error);
      // Don't throw error to avoid breaking the request
    }
  };
  
  // Automatically log the activity after response is sent
  res.on('finish', async () => {
    // Only log successful requests (2xx status codes)
    if (res.statusCode >= 200 && res.statusCode < 300 && req.user?.id) {
      try {
        await req.logActivity!({});
      } catch (error) {
        console.error('Failed to auto-log activity:', error);
      }
    }
  });
  
  next();
};

// Helper function to manually log activities in route handlers
export const logActivity = async (
  userId: string,
  action: string,
  entityType: string,
  options: {
    workspaceId?: number;
    entityId?: number;
    entityName?: string;
    details?: any;
    metadata?: any;
  } = {}
) => {
  try {
    const activityData: InsertActivityLog = {
      userId,
      action,
      entityType,
      workspaceId: options.workspaceId || null,
      entityId: options.entityId || null,
      entityName: options.entityName || null,
      details: options.details || {},
      metadata: options.metadata || {}
    };
    
    await storage.logActivity(activityData);
  } catch (error) {
    console.error('Failed to manually log activity:', error);
  }
};

// Activity context builder for AI
export const buildActivityContext = async (userId: string, workspaceId?: number): Promise<string> => {
  try {
    // Get recent user activities (last 24 hours)
    const recentActivities = await storage.getRecentUserActivities(userId, 24);
    
    // Get workspace activities if workspace ID provided
    const workspaceActivities = workspaceId 
      ? await storage.getWorkspaceActivities(workspaceId, 20)
      : [];
    
    // Build context string
    const context = [];
    
    if (recentActivities.length > 0) {
      context.push("## Recent User Activities (Last 24 Hours)");
      recentActivities.forEach(activity => {
        const timeAgo = getTimeAgo(activity.createdAt!);
        const entityInfo = activity.entityName ? ` "${activity.entityName}"` : '';
        context.push(
          `- ${timeAgo}: ${activity.action} ${activity.entityType}${entityInfo}`
        );
      });
      context.push("");
    }
    
    if (workspaceActivities.length > 0) {
      context.push("## Recent Workspace Activities");
      workspaceActivities.forEach(activity => {
        const timeAgo = getTimeAgo(activity.createdAt!);
        const entityInfo = activity.entityName ? ` "${activity.entityName}"` : '';
        context.push(
          `- ${timeAgo}: User ${activity.userId} ${activity.action} ${activity.entityType}${entityInfo}`
        );
      });
      context.push("");
    }
    
    return context.join('\n');
  } catch (error) {
    console.error('Failed to build activity context:', error);
    return '';
  }
};

// Helper function to format time ago
const getTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};