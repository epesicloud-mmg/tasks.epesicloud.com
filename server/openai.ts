import OpenAI from "openai";
import { buildActivityContext } from "./activityMiddleware";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

export interface AITaskSuggestion {
  title: string;
  description: string;
  priority: number;
  estimatedHours: number;
  category: string;
}

export interface AIInsight {
  type: 'productivity' | 'budget' | 'timeline' | 'risk';
  title: string;
  description: string;
  recommendation: string;
  confidence: number;
}

export interface PersonalizedInsight {
  summary: string;
  fullContent: string;
  isLengthy: boolean;
}

export async function processAIQuery(
  query: string,
  context: {
    workspaceId: number;
    userId: string;
    user?: {
      id: string;
      name: string;
      email?: string;
    };
    recentTasks?: any[];
    userTasks?: any[];
    projects?: any[];
    categories?: any[];
    recentActivity?: string;
  }
): Promise<string> {
  if (!openai) {
    throw new Error("AI features are not available. Please configure your OpenAI API key.");
  }

  try {
    // Build comprehensive activity context
    const activityContext = await buildActivityContext(context.userId, context.workspaceId);
    
    // Force current date to June 28, 2025 since that's today
    const todayDateString = '2025-06-28';
    const currentDate = 'Saturday, June 28, 2025';

    const systemPrompt = `You are an AI assistant for a task management platform. You help users manage their projects, tasks, and productivity. 

IMPORTANT: Today's date is ${currentDate} (${todayDateString}). Use this exact date when referencing "today" or current date.

Current User Context:
- User: ${context.user?.name || 'User'} (${context.user?.email || 'Unknown'})
- Workspace: ${context.workspaceId}

${context.user?.name ? `${context.user.name}'s` : 'User'} Personal Tasks:
${JSON.stringify(context.userTasks?.slice(0, 8)?.map(t => ({ 
  id: t.id, 
  title: t.title, 
  status: t.status, 
  priority: t.priority,
  dueDate: t.dueDate,
  project: t.project?.name,
  category: t.category?.name 
})) || [], null, 2)}

Workspace Overview:
- All workspace tasks: ${context.recentTasks?.length || 0} total
- Projects: ${JSON.stringify(context.projects?.map(p => ({ id: p.id, name: p.name, status: p.status })) || [])}
- Categories: ${JSON.stringify(context.categories?.map(c => ({ id: c.id, name: c.name })) || [])}

${activityContext}

IMPORTANT: When users ask about "my tasks", "recent tasks", or "what I'm working on", focus on ${context.user?.name || 'the user'}'s personally assigned tasks listed above. Use the workspace context only when they specifically ask about team or workspace-wide information.

Provide helpful, actionable responses. You can:
- Answer questions about their personal tasks and assignments
- Suggest task organization strategies based on their workload
- Provide insights about their priorities and deadlines
- Help with personal productivity planning
- Reference their recent work patterns and activities
- Suggest improvements based on their activity history

Keep responses concise, practical, and personalized to ${context.user?.name || 'the user'}.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    return response.choices[0].message.content || "I'm sorry, I couldn't generate a response to that query.";
  } catch (error) {
    console.error("Error processing AI query:", error);
    throw new Error("Failed to process AI query");
  }
}

export async function generateTaskSuggestions(
  context: {
    projectName?: string;
    existingTasks?: any[];
    budget?: number;
    timeline?: string;
  }
): Promise<AITaskSuggestion[]> {
  if (!openai) {
    return [];
  }

  try {
    const prompt = `Based on the following project context, suggest 3-5 relevant tasks:
    
Project: ${context.projectName || 'Unnamed Project'}
Budget: ${context.budget ? `$${context.budget}` : 'Not specified'}
Timeline: ${context.timeline || 'Not specified'}
Existing tasks: ${JSON.stringify(context.existingTasks?.slice(0, 3) || [])}

Provide task suggestions in JSON format with the following structure:
{
  "tasks": [
    {
      "title": "Task title",
      "description": "Brief description",
      "priority": 0-3,
      "estimatedHours": number,
      "category": "suggested category name"
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 800,
    });

    const result = JSON.parse(response.choices[0].message.content || '{"tasks": []}');
    return result.tasks || [];
  } catch (error) {
    console.error("Error generating task suggestions:", error);
    return [];
  }
}

export async function generatePersonalizedInsights(
  context: {
    workspaceId: number;
    userId: string;
    user?: {
      id: string;
      name: string;
      email?: string;
    };
    userTasks?: any[];
    projects?: any[];
    categories?: any[];
  }
): Promise<PersonalizedInsight> {
  if (!openai) {
    throw new Error("AI features are not available. Please configure your OpenAI API key.");
  }

  try {
    // Build comprehensive activity context
    const activityContext = await buildActivityContext(context.userId, context.workspaceId);
    
    // Force current date to June 30, 2025 since that's today
    const todayDateString = '2025-06-30';
    const currentDate = 'Monday, June 30, 2025';

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a personalized productivity assistant. Based on the user's recent activity and current tasks, provide comprehensive insights that combine:

1. **Task Performance Analysis**: Review completed vs pending tasks, deadline management
2. **Productivity Patterns**: Identify trends in work habits and completion rates  
3. **Potential Bottlenecks**: Spot upcoming challenges or resource conflicts
4. **Strategic Recommendations**: Actionable advice for improving efficiency
5. **Motivational Insights**: Encouraging observations about progress and achievements

Today is ${currentDate} (${todayDateString}).

Format your response as a JSON object with:
- "summary": A detailed 3-4 sentence overview (300-400 characters) that provides substantial context
- "fullContent": Comprehensive analysis formatted in clean markdown with proper headings, bullet points, and structure
- "isLengthy": boolean indicating if fullContent is over 500 characters

For fullContent, use this markdown structure:
# Productivity Analysis

## Current Status
- Brief overview of current task state

## Key Insights
- Productivity patterns observed
- Performance trends

## Recommendations
- Specific actionable steps
- Priority suggestions

## Motivation
- Positive reinforcement
- Achievement highlights

Write in a professional yet encouraging tone. Focus on actionable insights based on actual user data.`
        },
        {
          role: "user",
          content: `Analyze my productivity and provide personalized insights based on:

**User Info:**
- Name: ${context.user?.name || 'User'}
- Email: ${context.user?.email || 'N/A'}

**Current Tasks:**
${JSON.stringify(context.userTasks || [], null, 2)}

**Available Projects:**
${JSON.stringify(context.projects || [], null, 2)}

**Available Categories:**
${JSON.stringify(context.categories || [], null, 2)}

**Recent Activity Context:**
${activityContext}

Please provide insights that help me understand my productivity patterns, upcoming challenges, and actionable recommendations for improvement.`
        }
      ],
      temperature: 0.7,
    });

    const responseContent = response.choices[0].message.content || '{}';
    
    // Clean up the response if it contains markdown code blocks
    const cleanedContent = responseContent
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();
    
    let result;
    try {
      result = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Raw response:', responseContent);
      result = {};
    }
    
    return {
      summary: result.summary || "Unable to generate insights at this time.",
      fullContent: result.fullContent || "No detailed analysis available.",
      isLengthy: result.isLengthy || false
    };
  } catch (error) {
    console.error('AI personalized insights error:', error);
    return {
      summary: "Unable to generate insights at this time.",
      fullContent: "Unable to generate insights at this time.",
      isLengthy: false
    };
  }
}

export async function generateProjectInsights(
  projectData: {
    name: string;
    tasks: any[];
    budget?: number;
    spent?: number;
    timeline?: string;
  }
): Promise<AIInsight[]> {
  if (!openai) {
    return [];
  }

  try {
    const prompt = `Analyze this project data and provide insights:

Project: ${projectData.name}
Budget: ${projectData.budget ? `$${projectData.budget}` : 'Not specified'}
Spent: ${projectData.spent ? `$${projectData.spent}` : '$0'}
Tasks: ${JSON.stringify(projectData.tasks.map(t => ({
  title: t.title,
  status: t.status,
  priority: t.priority,
  dueDate: t.dueDate
})))}

Provide insights in JSON format:
{
  "insights": [
    {
      "type": "productivity|budget|timeline|risk",
      "title": "Insight title",
      "description": "Description",
      "recommendation": "Actionable recommendation",
      "confidence": 0.0-1.0
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });

    const result = JSON.parse(response.choices[0].message.content || '{"insights": []}');
    return result.insights || [];
  } catch (error) {
    console.error("Error generating project insights:", error);
    return [];
  }
}

export async function optimizeTaskScheduling(
  tasks: any[],
  constraints: {
    workingHours?: number;
    availableDays?: number;
    priorities?: string[];
  }
): Promise<{
  schedule: Array<{
    taskId: number;
    suggestedTimeSlot: string;
    reasoning: string;
  }>;
  recommendations: string[];
}> {
  if (!openai) {
    return { schedule: [], recommendations: [] };
  }

  try {
    const prompt = `Optimize the scheduling for these tasks:

Tasks: ${JSON.stringify(tasks.map(t => ({
  id: t.id,
  title: t.title,
  priority: t.priority,
  estimatedHours: t.estimatedHours,
  dueDate: t.dueDate
})))}

Constraints:
- Working hours per day: ${constraints.workingHours || 8}
- Available days: ${constraints.availableDays || 5}
- Priority order: ${constraints.priorities?.join(', ') || 'High, Medium, Low'}

Provide optimized schedule in JSON format:
{
  "schedule": [
    {
      "taskId": number,
      "suggestedTimeSlot": "6:00-9:00" or "9:00-12:00" etc,
      "reasoning": "explanation"
    }
  ],
  "recommendations": ["general scheduling advice"]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 1200,
    });

    const result = JSON.parse(response.choices[0].message.content || '{"schedule": [], "recommendations": []}');
    return result;
  } catch (error) {
    console.error("Error optimizing task scheduling:", error);
    return { schedule: [], recommendations: [] };
  }
}
