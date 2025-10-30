# Study Sync - Project Review Documentation

## 📋 Project Overview
Study Sync is a collaborative academic management platform designed for students to manage assignments, exams, and group work with AI-powered voice assistance and gamification features.

---

## 🏗️ Architecture

### System Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer (React SPA)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Components  │  │    Hooks     │  │   Services   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Supabase Backend Layer                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PostgreSQL  │  │    Auth      │  │   Storage    │      │
│  │   Database   │  │   System     │  │   Buckets    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │Edge Functions│  │     RLS      │                        │
│  │    (Deno)    │  │   Policies   │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   External Services                          │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │  Lovable AI  │  │  OpenAI API  │                        │
│  │   Gateway    │  │              │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 👥 Actors/User Roles

### 1. **Students (Primary Users)**
   - Create and manage personal reminders/assignments
   - Join and participate in study groups
   - Complete assignments and earn points
   - View exam schedules
   - Use voice assistant for quick tasks
   - Compete on leaderboard

### 2. **Group Creators**
   - Create study groups
   - Manage group members
   - Share group assignments
   - Delete/edit group content

### 3. **System (Automated)**
   - Process voice commands
   - Award points on assignment completion
   - Send notifications
   - Sync external integrations (planned)

---

## 💻 Frontend Technologies

### Core Framework & Language
- **React 18.3.1** - UI library for building component-based interface
- **TypeScript** - Type-safe JavaScript for better code quality
- **Vite** - Fast build tool and development server

### UI Framework & Styling
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality, accessible component library built on Radix UI
- **Radix UI** - Unstyled, accessible UI primitives
- **Lucide React** - Modern icon library
- **tailwindcss-animate** - Animation utilities

### Routing & State Management
- **React Router DOM 6.30.1** - Client-side routing
- **TanStack Query 5.83.0** - Server state management, caching, and synchronization

### Form Handling & Validation
- **React Hook Form 7.61.1** - Performant form management
- **Zod 3.25.76** - TypeScript-first schema validation
- **@hookform/resolvers** - Form validation resolvers

### Additional Libraries
- **date-fns 4.1.0** - Date manipulation and formatting
- **react-day-picker** - Date picker component
- **sonner** - Toast notification system
- **embla-carousel-react** - Carousel/slider component
- **recharts** - Data visualization library

---

## 🔧 Backend Technologies

### Database & Backend Platform
- **Supabase** - Open-source Firebase alternative
  - PostgreSQL database
  - Built-in authentication
  - Row Level Security (RLS)
  - Real-time subscriptions
  - Storage buckets

### Serverless Functions
- **Deno** - Runtime for edge functions
- **Supabase Edge Functions** - Serverless compute

### Authentication
- **Supabase Auth** - Email/password authentication with JWT tokens

---

## 🗄️ Database Schema

### Tables

#### 1. **users**
```sql
- id (uuid, primary key)
- auth_user_id (uuid, references auth.users)
- username (text)
- email (text)
- points (integer, default: 0)
- created_at (timestamp)
- updated_at (timestamp)
```
**Purpose**: Store user profiles and gamification points

#### 2. **reminders**
```sql
- id (uuid, primary key)
- title (text)
- description (text)
- subject (text)
- deadline (timestamp)
- created_by (uuid)
- group_id (uuid, nullable)
- source (text: 'manual', 'google_classroom', 'ms_teams')
- created_at (timestamp)
- updated_at (timestamp)
```
**Purpose**: Store assignments/reminders with source tracking

#### 3. **groups**
```sql
- id (uuid, primary key)
- name (text)
- description (text)
- created_by (uuid)
- created_at (timestamp)
- updated_at (timestamp)
```
**Purpose**: Organize students into study groups

#### 4. **group_members**
```sql
- id (uuid, primary key)
- group_id (uuid)
- user_id (uuid)
- role (text, default: 'member')
- joined_at (timestamp)
```
**Purpose**: Track group membership

#### 5. **exams**
```sql
- id (uuid, primary key)
- subject (text)
- exam_type (text)
- exam_date (timestamp)
- description (text)
- created_by (uuid)
- group_id (uuid, nullable)
- uploader_name (text)
- created_at (timestamp)
- updated_at (timestamp)
```
**Purpose**: Schedule and track exams

#### 6. **reminder_completions**
```sql
- id (uuid, primary key)
- reminder_id (uuid)
- user_id (uuid)
- completed_at (timestamp)
- points_awarded (integer, default: 10)
- file_url (text, nullable)
```
**Purpose**: Track assignment submissions and award points

#### 7. **subjects**
```sql
- id (uuid, primary key)
- name (text)
- created_by (uuid)
- created_at (timestamp)
```
**Purpose**: Manage subject/course list

#### 8. **user_integrations** (New)
```sql
- id (uuid, primary key)
- user_id (uuid)
- platform (text: 'google_classroom', 'ms_teams')
- access_token (text)
- refresh_token (text)
- token_expires_at (timestamp)
- last_sync_at (timestamp)
- created_at (timestamp)
- updated_at (timestamp)
```
**Purpose**: Store OAuth tokens for external integrations

### Storage Buckets
- **assignments** - Store uploaded assignment files (PDFs, images, etc.)

---

## 🔐 Security Implementation

### Row Level Security (RLS) Policies

#### Users Table
- ✅ Users can view all profiles
- ✅ Users can update their own profile
- ✅ Users can insert their own profile

#### Reminders Table
- ✅ Users can view public reminders or group reminders they belong to
- ✅ Users can create their own reminders
- ✅ Users can update their own reminders
- ✅ Users can delete their own reminders

#### Groups Table
- ✅ Users can view groups they belong to
- ✅ Users can create groups
- ✅ Group creators can update their groups
- ✅ Group creators can delete their groups

#### Group Members Table
- ✅ Users can view members of groups they belong to
- ✅ Group creators can add members
- ✅ Users can remove themselves or creators can remove members

#### Exams Table
- ✅ Users can view exams in their groups
- ✅ Users can create exams
- ✅ Users can update their own exams
- ✅ Users can delete their own exams

#### Reminder Completions Table
- ✅ Users can view all completions
- ✅ Users can create their own completions
- ✅ Users can update their own completions

---

## 🚀 Edge Functions

### 1. **voice-assistant** (JWT Required)
**Purpose**: Process natural language voice commands using AI

**Technologies**:
- Lovable AI Gateway (Gemini 2.5 Flash)
- OpenAI API (GPT models)

**Capabilities**:
- Query reminders and exams
- Delete reminders/exams
- Create new reminders/exams
- Natural language understanding

**Flow**:
```
Voice Input → voice-to-text → voice-assistant → AI Processing → Database Action
```

### 2. **voice-to-text** (JWT Required)
**Purpose**: Convert voice audio to text transcription

**Technologies**:
- Web Speech API (client-side)
- Future: OpenAI Whisper API integration

### 3. **check-duplicate** (Public, no JWT)
**Purpose**: Check for duplicate assignments before creation

**Flow**:
```
New Reminder → check-duplicate → Database Query → Return Match Status
```

---

## 🎯 Key Features

### 1. **Assignment Management**
- Create, edit, delete assignments
- Set deadlines and subjects
- Add descriptions and details
- Upload submission files
- Mark assignments as complete
- Source tracking (manual, Google Classroom, MS Teams)

### 2. **Group Collaboration**
- Create study groups
- Invite/remove members
- Share assignments within groups
- Group-specific exam schedules
- Role-based permissions (creator/member)

### 3. **Exam Scheduling**
- Schedule exams with date/time
- Specify exam type (midterm, final, quiz, etc.)
- Group or personal exams
- Automatic sorting by date

### 4. **Gamification System**
- Point system (10 points per completed assignment)
- Leaderboard ranking
- User statistics dashboard
- Completion tracking

### 5. **Voice Assistant** 🎤
- Natural language commands
- Voice-activated task creation
- Query reminders and exams
- Delete tasks via voice
- Conversational AI responses

### 6. **Search & Filter**
- Search by title, subject, or description
- Filter by subject
- Filter by status (completed/pending/overdue)
- Real-time filtering

### 7. **Notifications**
- Deadline reminders
- Overdue alerts
- Group activity notifications
- Achievement notifications

### 8. **User Dashboard**
- Statistics overview
- Recent activity
- Upcoming deadlines
- Points and rank display

### 9. **File Management**
- Upload assignment files
- Secure storage in Supabase buckets
- File preview and download

### 10. **External Integrations** (Planned)
- Google Classroom auto-sync
- Microsoft Teams auto-sync
- Hourly automatic fetching
- Source badge indicators (GCR, MS)

---

## 🔌 APIs Used

### 1. **Lovable AI Gateway**
- **Endpoint**: `https://ai.gateway.lovable.dev/v1/chat/completions`
- **Model**: `google/gemini-2.5-flash`
- **Purpose**: Voice assistant NLU and conversational responses
- **Authentication**: Bearer token (LOVABLE_API_KEY)

### 2. **OpenAI API** (Alternative)
- **Endpoint**: `https://api.openai.com/v1/chat/completions`
- **Models**: GPT-4, GPT-3.5-turbo
- **Purpose**: Backup AI processing for voice assistant
- **Authentication**: Bearer token (OPENAI_API_KEY)

### 3. **Supabase REST API**
- **Purpose**: Database operations (CRUD)
- **Authentication**: JWT tokens
- **Features**: Auto-generated from PostgreSQL schema

### 4. **Supabase Auth API**
- **Purpose**: User authentication and session management
- **Methods**: Sign up, sign in, sign out
- **Features**: JWT token generation and refresh

### 5. **Supabase Storage API**
- **Purpose**: File uploads and downloads
- **Features**: Secure bucket storage with RLS

### 6. **Supabase Realtime API** (Future)
- **Purpose**: Live updates and collaborative features
- **Features**: WebSocket-based subscriptions

---

## 📱 Application Flow

### User Authentication Flow
```
1. User visits app
2. Check for existing session
3. If no session → Redirect to Auth page
4. User signs up/logs in
5. Create profile in users table (trigger)
6. Generate JWT token
7. Redirect to dashboard
```

### Assignment Creation Flow
```
1. User clicks "Create Reminder"
2. Fill form (title, subject, deadline, description)
3. Optional: Select group
4. Submit form
5. Validate with Zod schema
6. Check for duplicates (edge function)
7. Insert into reminders table
8. Update UI with TanStack Query
9. Show success toast
```

### Assignment Completion Flow
```
1. User clicks "Mark Complete" on reminder
2. Optional: Upload file
3. Upload file to storage bucket (if provided)
4. Insert into reminder_completions table
5. Trigger fires: award_points_on_completion()
6. Update users table (add 10 points)
7. Invalidate queries
8. Update leaderboard
9. Show success notification
```

### Voice Assistant Flow
```
1. User clicks voice button
2. Start speech recognition (Web Speech API)
3. Convert voice to text
4. Send text to voice-assistant edge function
5. Determine action type (query/delete/create)
6. Process with AI (Lovable AI Gateway)
7. Execute database operation
8. Return conversational response
9. Display response in UI
10. Update relevant data
```

---

## 🎨 Design System

### Color Tokens (HSL)
- Primary: Brand colors for main actions
- Secondary: Supporting colors
- Accent: Highlight and emphasis
- Background: Page and card backgrounds
- Foreground: Text colors
- Muted: Subdued elements
- Destructive: Error and delete actions

### Component Library
- Built on shadcn/ui and Radix UI
- Fully accessible (ARIA compliant)
- Dark mode support
- Consistent design language
- Customizable variants

---

## 📊 State Management Strategy

### Server State (TanStack Query)
- Reminders data
- Exams data
- Groups data
- User stats
- Leaderboard
- Automatic caching and revalidation

### Local State (React useState)
- Form inputs
- Modal visibility
- Loading states
- Voice assistant status

### Authentication State (Supabase Auth)
- Current user session
- JWT tokens
- User profile data

---

## 🔮 Future Enhancements (Planned)

1. **External Integrations**
   - Google Classroom auto-fetch
   - Microsoft Teams auto-fetch
   - OAuth 2.0 authentication flow
   - Hourly sync schedule

2. **Mobile App**
   - Capacitor integration (already configured)
   - Native Android/iOS apps
   - Push notifications

3. **Real-time Collaboration**
   - Live group chat
   - Shared notes
   - Collaborative editing

4. **Advanced Analytics**
   - Performance insights
   - Study time tracking
   - Subject-wise statistics

5. **AI Study Assistant**
   - Study plan generation
   - Resource recommendations
   - Exam preparation tips

---

## 🛠️ Development Setup

### Prerequisites
```bash
- Node.js 18+
- npm/pnpm/bun
- Supabase account
- Git
```

### Installation
```bash
# Clone repository
git clone <repo-url>

# Install dependencies
npm install

# Set up environment variables
# Copy .env.example to .env
# Add Supabase credentials

# Run development server
npm run dev
```

### Environment Variables
```
VITE_SUPABASE_URL=https://zyrfekdovlsxoqzyhutk.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

---

## 📈 Performance Optimizations

1. **Code Splitting** - Route-based lazy loading
2. **Caching** - TanStack Query automatic caching
3. **Optimistic Updates** - Instant UI feedback
4. **Debouncing** - Search input optimization
5. **Pagination** - Efficient data loading (ready for implementation)
6. **Edge Functions** - Serverless compute at edge locations

---

## 🧪 Testing Strategy (Future)

- Unit tests with Vitest
- Integration tests with Testing Library
- E2E tests with Playwright
- Edge function tests with Deno test

---

## 📝 Conclusion

Study Sync is a modern, full-stack academic management platform built with cutting-edge technologies. It combines React's powerful frontend capabilities with Supabase's robust backend infrastructure to deliver a seamless, secure, and feature-rich experience for students.

**Key Strengths:**
- ✅ Type-safe codebase with TypeScript
- ✅ Secure authentication and RLS policies
- ✅ AI-powered voice assistant
- ✅ Real-time data synchronization
- ✅ Scalable serverless architecture
- ✅ Modern, accessible UI design
- ✅ Gamification for engagement

**Tech Stack Summary:**
- **Frontend**: React + TypeScript + Tailwind + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **AI**: Lovable AI Gateway + OpenAI
- **State**: TanStack Query
- **Build**: Vite
- **Deployment**: Lovable Platform

---

## 📞 Support & Resources

- **Documentation**: Project README.md
- **Supabase Dashboard**: https://supabase.com/dashboard
- **Lovable AI Docs**: https://docs.lovable.dev/features/ai
- **Component Library**: https://ui.shadcn.com

---

*Last Updated: 2025-10-30*
