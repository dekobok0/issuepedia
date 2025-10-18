# Issuepedia - Developer Knowledge Platform

## Overview

Issuepedia is a developer-focused knowledge platform for collaborative prompt engineering and review. The platform enables users to create, share, and review AI prompts with a gamification system that rewards quality contributions through reputation points and achievement badges.

The application features a visual prompt composer alongside text-based editing, peer review workflows with approval/rejection mechanisms, and a comprehensive reputation system that encourages high-quality submissions and accurate reviews.

## Recent Changes (October 18, 2025)

### Fork Functionality Implementation
- **Fork Feature**: Implemented Stack Overflow-style fork functionality allowing users to create improved versions of existing prompts while maintaining attribution
  - Added POST /api/v1/prompts/:id/fork API endpoint for creating prompt forks
  - Forked prompts inherit techniques from original prompt automatically
  - Forks created with status='draft', redirected to edit page for customization
  - parentPromptId field tracks attribution chain
  
- **Technique Management in Edit Mode**: Added comprehensive technique editing capabilities
  - Implemented DELETE /api/v1/prompts/:id/techniques/:techniqueId endpoint for removing technique links
  - Edit page now supports adding and removing techniques from forked prompts
  - Technique changes properly synchronized on save
  
- **Fork Gamification Rewards**: Extended reputation system for fork attribution bonuses
  - Original authors receive +5 reputation when their prompt is forked and the fork gets approved
  - Implemented in reputationSystem.handleReviewSubmission by checking parentPromptId
  - Encourages high-quality original content that inspires derivative works

### Technical Implementation Details
- `forkPrompt()` storage method copies prompt data and technique links to new draft prompt
- Edit page (/prompts/:id/edit) manages technique state with add/remove diff logic
- All changes verified through end-to-end Playwright testing

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript, using Vite as the build tool and development server.

**UI Framework**: Shadcn/ui component library built on Radix UI primitives, styled with Tailwind CSS. The design system follows a technical platform aesthetic inspired by GitHub's Primer design, prioritizing information density and professional credibility.

**Design Principles**:
- Information-first approach with content clarity over decoration
- Functional visual hierarchy based on task priority
- Technical blue primary color (HSL: 220 90% 56%) for main actions
- Purple accent (HSL: 262 83% 58%) for gamification elements
- Full light/dark mode support with carefully crafted color palettes

**State Management**: TanStack Query (React Query) for server state management with custom query client configuration. Authentication state managed through session-based Replit Auth.

**Routing**: Wouter for lightweight client-side routing.

**Type Safety**: Full TypeScript implementation with shared types between client and server via path aliases (@/, @shared/).

### Backend Architecture

**Runtime**: Node.js with Express framework for REST API endpoints.

**API Design**: RESTful API with routes prefixed `/api/v1/` for versioning. Key endpoints include:
- `/api/v1/prompts` - CRUD operations for prompts
- `/api/v1/prompts/:id/fork` - Fork existing prompts with technique inheritance
- `/api/v1/prompts/:id/techniques` - Add techniques to prompts (POST)
- `/api/v1/prompts/:id/techniques/:techniqueId` - Remove techniques from prompts (DELETE)
- `/api/v1/reviews` - Review submission and management
- `/api/v1/votes` - Upvote/downvote system
- `/api/v1/comments` - Commenting functionality
- `/api/auth/user` - Authentication status

**Authentication**: Replit Auth via OpenID Connect (OIDC) with Passport.js strategy. Session management using express-session with PostgreSQL session store (connect-pg-simple). Sessions persist for 7 days with secure, HTTP-only cookies.

**Data Validation**: Zod schemas generated from Drizzle ORM schema definitions using drizzle-zod for runtime validation of API inputs.

**Error Handling**: Centralized error middleware with status code and message extraction, throwing errors for proper logging while returning JSON error responses.

### Database Architecture

**ORM**: Drizzle ORM with PostgreSQL dialect, using Neon serverless PostgreSQL driver with WebSocket support.

**Schema Design**:

**Core Tables**:
- `users` - User profiles with reputation scores, linked to Replit OIDC identity
- `prompts` - Dual representation (text + JSON) for visual composer and executable text
- `reviews` - Peer review records with approve/reject/request-changes states
- `votes` - Upvote/downvote tracking for prompts and comments
- `comments` - Discussion threads on prompts
- `promptTechniques` - Catalog of prompt engineering techniques
- `promptTechniqueLinks` - Many-to-many relationship between prompts and techniques

**Gamification Tables**:
- `reputationEvents` - Audit log of all reputation changes with event types
- `badges` - Achievement definitions with unlock criteria
- `userBadges` - Badge awards to users with unlock timestamps

**Key Design Decisions**:
- Prompts store both `promptBodyText` (final executable) and `promptBodyJson` (visual graph) to support dual editing modes
- Reputation system uses event sourcing pattern for auditability
- Version tracking on prompts enables forking/iteration workflows
- Session storage in database rather than memory for production scalability

### Gamification & Reputation System

**Reputation Events**:
- PROMPT_UPVOTED: +10 points (to prompt author)
- PROMPT_DOWNVOTED: -2 points (to prompt author)
- DOWNVOTE_CAST: -1 point (to voter, Stack Overflow rule)
- DOWNVOTE_REMOVED: +1 point (to voter, when removing downvote)
- REVIEW_APPROVED: +15 points
- REVIEW_REJECTED: -5 points
- ACCURATE_REVIEW: +5 points (when review aligns with consensus)
- FIRST_PROMPT_APPROVED: +50 points
- COMMENT_UPVOTED: +2 points
- FORK_APPROVED: +5 points (to original author when their prompt is forked and the fork gets approved)

**Permission Thresholds (Stack Overflow-style)**:
- 15 reputation: Upvote privilege
- 50 reputation: Comment privilege
- 125 reputation: Downvote privilege
- 500 reputation: Review privilege

**Badge System**: Condition-based achievement unlocking with badges for:
- First Chain-of-Thought prompt approval
- Reaching reputation milestones (500, 2000 points)
- Custom badge definitions stored in database

**Implementation**: Reputation changes trigger badge evaluation asynchronously, checking unlock conditions and awarding badges when criteria are met.

**Permission System Implementation**:
- Backend enforcement via middleware checking user reputation before allowing actions
- API returns 403 Forbidden when user lacks required reputation
- Frontend UI disables buttons and shows tooltips explaining required reputation
- Helper functions (canUpvote, canComment, canDownvote) in shared/schema.ts for consistent permission checks

### Community Interaction Features

**Voting System**: 
- Upvote/downvote functionality for prompts
- Vote count aggregation at storage layer for performance
- User-specific vote tracking to prevent duplicate votes
- Reputation rewards: +10 for upvotes, -2 for downvotes
- VoteButtons reusable component with optimistic UI updates
- Real-time cache invalidation via TanStack Query mutations

**Commenting System**:
- Comment posting on prompt detail pages (authenticated users only)
- Comment display with author information and timestamps
- Comment count aggregation in prompt listings
- Full CRUD operations via storage layer

**User Profile Pages**:
- Public profile accessible at /users/:username
- Displays user reputation score, join date, and badge collection
- Shows submitted prompts with techniques and vote counts
- Lists review history with vote type (approve/reject) and timestamps
- Tab navigation between "Prompts" and "Reviews" sections

**Data Architecture**:
- `PromptWithStats` type extends base Prompt with voteCount and commentCount
- `getPromptsWithTechniques()` returns aggregated statistics for listings
- `getPromptWithTechniques()` returns detailed prompt with techniques for detail view
- Default status filter ensures only approved prompts appear on homepage

## External Dependencies

### Authentication
- **Replit Auth (OIDC)**: Primary authentication provider via OpenID Connect discovery
- **Passport.js**: Authentication middleware with openid-client strategy
- **Session Store**: PostgreSQL-backed sessions via connect-pg-simple

### Database
- **Neon Serverless PostgreSQL**: Managed PostgreSQL with WebSocket driver (@neondatabase/serverless)
- **Drizzle ORM**: Type-safe database queries and schema management
- **Migration Tool**: Drizzle Kit for schema migrations

### UI Components
- **Radix UI**: Headless component primitives (40+ components including Dialog, Dropdown, Toast, etc.)
- **Shadcn/ui**: Pre-styled component implementations
- **Tailwind CSS**: Utility-first styling with custom design tokens
- **Lucide React**: Icon library

### Development Tools
- **Vite**: Build tool with custom plugins for Replit integration (@replit/vite-plugin-cartographer, @replit/vite-plugin-dev-banner)
- **TypeScript**: Full type safety across frontend and backend
- **ESBuild**: Server bundle compilation for production

### Fonts
- **Inter**: Primary interface font (Google Fonts)
- **JetBrains Mono / Fira Code**: Monospace fonts for code/prompts
- **DM Sans, Geist Mono, Architects Daughter**: Additional typeface options

### Key Environment Variables
- `DATABASE_URL`: PostgreSQL connection string (required)
- `REPL_ID`: Replit application identifier for OIDC
- `SESSION_SECRET`: Session encryption key
- `ISSUER_URL`: OIDC issuer endpoint (defaults to replit.com/oidc)
- `REPLIT_DOMAINS`: Allowed domains for authentication