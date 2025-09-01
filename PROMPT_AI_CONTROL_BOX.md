# Floating AI Control Box - Implementation Prompt

## Overview
Build a floating, draggable AI assistant widget that provides intelligent task management assistance with conversation management, quick actions, and contextual insights. This component should integrate seamlessly with a task management application.

## Core Features

### 1. **Floating Widget Design**
- **Position**: Fixed positioning with drag-and-drop functionality
- **Initial State**: Centered at bottom of viewport, collapsed by default
- **Visual Design**: Card-based with glass-morphism effect (backdrop-blur, semi-transparent white background)
- **Responsive**: Maximum width 2xl (32rem), full-width on mobile with padding

### 2. **Drag and Drop Functionality**
- **Draggable Areas**: Widget header and AI avatar circle
- **Constraints**: Keep within viewport boundaries
- **Smooth Movement**: Real-time position updates with mouse tracking
- **Visual Feedback**: Cursor changes to 'move' on draggable elements
- **State Management**: Persistent position until page reload

### 3. **Two-State Interface**

#### **Collapsed State (Command Bar)**
- **AI Avatar**: 40px circular gradient button (blue-to-purple) with Bot icon
- **Input Field**: Full-width text input with send button overlay
- **Placeholder**: "Ask your AI assistant anything..."
- **Quick Actions**: Two pill-shaped buttons below input:
  - "Give Insights" with BarChart3 icon
  - "Summarize my Task Status And Priorities" with Sparkles icon
- **Expand Button**: ChevronUp icon to show chat history

#### **Expanded State (Full Chat Panel)**
- **Header**: Draggable header with gradient background (blue-50 to purple-50)
  - AI avatar with Bot icon
  - Title "AI Assistant" with conversation count
  - Action buttons: New conversation (+), History, Collapse (ChevronDown)
- **Chat Area**: Scrollable message history with markdown support
- **Command Bar**: Same as collapsed state but attached below chat

### 4. **Conversation Management**
- **Multiple Conversations**: Support for conversation switching and history
- **Message Threading**: Each conversation maintains separate message history
- **Conversation List Modal**: Dialog showing all conversations with titles and timestamps
- **New Conversation**: Button to start fresh conversation threads

### 5. **Message System**

#### **Message Types with Icons**
- **User Messages**: Blue User icon, right-aligned bubbles
- **AI Responses**: Purple Bot icon, left-aligned with markdown rendering
- **System Messages**: Gray Info icon
- **Context Messages**: Orange FileText icon
- **Tool Calls**: Green Settings icon
- **Tool Results**: Emerald CheckCircle icon

#### **Message Rendering**
- **Markdown Support**: Full markdown with syntax highlighting
- **Custom Styling**: Tailored prose classes for readability
- **Auto-scroll**: Smooth scroll to bottom on new messages
- **Timestamp Display**: Formatted time for each message

### 6. **AI Integration**

#### **Quick Actions**
- **Task Insights**: "Analyze my task performance and provide insights on productivity patterns and bottlenecks"
- **Status Summary**: "Summarize my current task status, priorities, and what I should focus on today"
- **Loading States**: Animated indicators during AI processing

#### **Context Awareness**
- **Workspace Integration**: AI has access to current workspace data
- **Task Context**: Can analyze user's tasks, projects, and productivity patterns
- **Real-time Data**: Fetches current task status and workspace information

### 7. **Technical Implementation**

#### **Technology Stack**
- **React 18** with TypeScript
- **TanStack Query** for data fetching and caching
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **React Markdown** with remark-gfm for message rendering
- **shadcn/ui** components (Button, Input, Card, Dialog, ScrollArea, Badge)

#### **API Endpoints Required**
```typescript
// Fetch conversations for workspace
GET /api/workspaces/{workspaceId}/conversations

// Fetch messages for specific conversation
GET /api/workspaces/{workspaceId}/conversations/{conversationId}/messages

// Fetch general chat messages
GET /api/workspaces/{workspaceId}/chat

// Send new message
POST /api/workspaces/{workspaceId}/chat
Body: { message: string, conversationId?: string }

// Start new conversation
POST /api/workspaces/{workspaceId}/conversations/new

// Update conversation title
PATCH /api/workspaces/{workspaceId}/conversations/{conversationId}
Body: { title: string }

// Delete conversation
DELETE /api/workspaces/{workspaceId}/conversations/{conversationId}
```

#### **Data Types**
```typescript
interface ChatMessage {
  id: number;
  message: string;
  response: string;
  createdAt: string;
  conversationId: string;
}

interface Conversation {
  conversationId: string;
  title: string | null;
  lastMessage: string;
  lastActivity: Date;
  messageCount: number;
}
```

### 8. **Styling Guidelines**

#### **Color Scheme**
- **AI Gradient**: `from-blue-500 to-purple-500`
- **Header Gradient**: `from-blue-50 to-purple-50`
- **Background**: `bg-white/95 backdrop-blur-sm`
- **Shadows**: `shadow-2xl` for depth
- **Text Colors**: Gray scale (800, 600, 500) for hierarchy

#### **Animations**
- **Loading Spinner**: Rotating border animation
- **Smooth Transitions**: 200ms duration for hover states
- **Pulse Animation**: Blue dot for "AI thinking" indicator
- **Backdrop Blur**: Glass-morphism effect

### 9. **User Experience Features**

#### **Accessibility**
- **Keyboard Navigation**: Enter to send, Escape to close
- **Focus Management**: Auto-focus input when expanded
- **Screen Reader**: Proper ARIA labels and semantic structure
- **Tooltips**: Helpful hints for all interactive elements

#### **Loading States**
- **Message Sending**: Send button shows spinner
- **Quick Actions**: Disabled state with loading indication
- **AI Processing**: "AI is thinking..." with animated pulse

#### **Error Handling**
- **Network Errors**: Graceful fallback messages
- **Validation**: Prevent empty message submission
- **Workspace Validation**: Check for valid workspace before API calls

### 10. **Integration Requirements**

#### **Workspace Context**
- **Props**: `workspaceId` as required prop
- **Validation**: Ensure valid workspace before enabling features
- **Data Sync**: Invalidate queries after successful operations

#### **Query Management**
- **Caching Strategy**: Use TanStack Query for efficient data caching
- **Cache Invalidation**: Refresh conversations and messages after mutations
- **Optimistic Updates**: Immediate UI updates with rollback on failure

### 11. **Advanced Features**

#### **Conversation Management**
- **Title Editing**: Inline editing with save/cancel
- **Conversation Deletion**: Confirmation before permanent removal
- **History Navigation**: Easy switching between conversations
- **Auto-titling**: Generate meaningful titles based on conversation content

#### **Smart Positioning**
- **Viewport Awareness**: Stay within screen boundaries
- **Collision Detection**: Avoid overlapping with other UI elements
- **Mobile Optimization**: Responsive behavior on smaller screens

## Implementation Notes

1. **Start with Basic Structure**: Build the floating container with drag functionality first
2. **Add State Management**: Implement expand/collapse with smooth transitions
3. **Integrate Chat Features**: Add message display and sending capabilities
4. **Implement Conversations**: Add conversation management and switching
5. **Polish UX**: Add animations, loading states, and error handling
6. **Test Integration**: Ensure proper workspace context and API integration

## Success Criteria

- ✅ Widget floats at bottom center initially and is draggable anywhere
- ✅ Smooth expand/collapse animation with full chat history
- ✅ Functional message sending with markdown rendering
- ✅ Quick action buttons trigger AI responses
- ✅ Conversation management with history and switching
- ✅ Responsive design works on mobile and desktop
- ✅ Loading states and error handling work properly
- ✅ Glass-morphism visual design matches specification
- ✅ Keyboard shortcuts and accessibility features function
- ✅ Integrates seamlessly with existing task management interface

This floating AI control box should feel like a natural extension of the workspace, providing intelligent assistance while staying out of the way when not needed.