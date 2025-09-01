# TasksAI - Intelligent Task Management Platform

## Overview
TasksAI is a full-stack task management application designed to enhance productivity through AI-powered assistance. It facilitates project and task organization, multi-workspace collaboration, real-time AI chat, and intelligent task suggestions. The platform aims to streamline task management, providing users with smart tools for efficient workflow and project oversight.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 (TypeScript)
- **Routing**: Wouter
- **State Management**: TanStack Query
- **UI Framework**: shadcn/ui (built on Radix UI)
- **Styling**: Tailwind CSS
- **Build Tool**: Vite

### Backend
- **Runtime**: Node.js (TypeScript)
- **Framework**: Express.js (REST API)
- **Database**: PostgreSQL with Drizzle ORM (Neon serverless)
- **Authentication**: Replit Auth (OpenID Connect)
- **Session Management**: Express sessions (PostgreSQL store)
- **AI Integration**: OpenAI API

### Core Features
- **Authentication**: Replit Auth with PostgreSQL-backed sessions and user profile management.
- **Workspace Management**: Multi-tenancy with role-based access and data isolation.
- **Task Management**: Hierarchical structure (Projects > Tasks > Categories), status tracking (Todo, In Progress, Completed), priority system, due dates, and granular time slots.
- **AI Integration**: Real-time AI chat, task suggestions, project insights, and context-aware assistance.
- **File Management**: Document storage with project-specific vaults and quick note-taking.
- **Financial Management**: Comprehensive system for project budgets, inflows, and outflows with predefined categories and real-time tracking.
- **Activity Tracking**: Middleware for logging user activities to provide rich AI context.
- **Notifications**: Email alerts for task assignments, completions, comments, and status changes, including @mention functionality.
- **Collaboration**: Task comments with nested conversations and @mentions for targeted notifications.
- **Views**: Kanban, Team, Day, Week, Month, Project, and Category views with consistent drag-and-drop functionality.
- **Search**: Global search across tasks, projects, members, and categories.
- **UI/UX Decisions**: Professional, minimalist design with subtle gradients, animations, and color-coded metrics. Features include customizable default views, "See more" expansions, and consistent navigation.

## External Dependencies

- **Database & ORM**: `@neondatabase/serverless`, `drizzle-orm`
- **AI**: `openai`
- **State Management**: `@tanstack/react-query`
- **Session Management**: `express-session`
- **UI Components**: `@radix-ui/*`, `tailwindcss`, `class-variance-authority`, `lucide-react`
- **File Uploads**: `multer`
- **Email**: `nodemailer` (for SMTP)
- **Markdown Rendering**: `react-markdown`, `remark-gfm`