# Issuepedia Design Guidelines

## Design Approach

**Selected Approach**: Design System - Technical Platform Hybrid
**Justification**: As a developer-focused knowledge platform requiring high information density, professional aesthetics, and functional clarity, Issuepedia draws inspiration from GitHub's Primer design system and Stack Overflow's proven UX patterns, adapted for prompt engineering education.

**Core Design Principles**:
1. **Information First**: Content clarity and readability trump decorative elements
2. **Functional Hierarchy**: Visual weight follows user task priority
3. **Professional Credibility**: Clean, technical aesthetic builds trust with developer audience
4. **Cognitive Scaffolding**: UI elements support learning and comprehension

---

## Color Palette

### Light Mode
- **Primary**: 220 90% 56% (Technical blue, inspired by GitHub)
- **Primary Hover**: 220 90% 48%
- **Secondary**: 262 83% 58% (Purple accent for gamification elements)
- **Background**: 0 0% 100%
- **Surface**: 210 20% 98%
- **Border**: 214 32% 91%
- **Text Primary**: 213 27% 12%
- **Text Secondary**: 215 16% 47%
- **Success**: 142 76% 36% (Approved status)
- **Warning**: 38 92% 50% (Pending review)
- **Error**: 0 84% 60% (Rejected status)

### Dark Mode
- **Primary**: 217 91% 60%
- **Primary Hover**: 217 91% 68%
- **Secondary**: 262 83% 70%
- **Background**: 222 47% 11%
- **Surface**: 217 33% 17%
- **Border**: 215 27% 23%
- **Text Primary**: 210 40% 98%
- **Text Secondary**: 215 20% 65%
- **Success**: 142 70% 45%
- **Warning**: 38 92% 60%
- **Error**: 0 84% 70%

---

## Typography

**Font Stack**:
- **Primary**: 'Inter', system-ui, -apple-system, sans-serif (interface, body text)
- **Code/Mono**: 'JetBrains Mono', 'Fira Code', monospace (prompts, code blocks)
- **Headings**: 'Inter', weight 600-700

**Scale**:
- **Hero/H1**: text-4xl (36px), font-semibold, leading-tight
- **H2**: text-2xl (24px), font-semibold, leading-snug
- **H3**: text-xl (20px), font-semibold
- **Body**: text-base (16px), leading-relaxed
- **Small**: text-sm (14px)
- **Code**: text-sm, font-mono

---

## Layout System

**Spacing Primitives**: Use Tailwind units of **2, 3, 4, 6, 8, 12, 16, 20** for consistent rhythm
- Micro spacing (within components): 2, 3, 4
- Component spacing: 6, 8
- Section spacing: 12, 16, 20

**Grid System**:
- **Container**: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
- **Content Area**: max-w-4xl for optimal reading (prose-like content)
- **Sidebar Layouts**: 2/3 + 1/3 split on desktop, stack on mobile

---

## Component Library

### Navigation
- **Top Nav**: Persistent header with logo left, search center, user profile right
- **Sidebar**: Collapsible navigation for dashboard/tools (inspired by GitHub's repo navigation)
- **Tabs**: Underline style for content sections (Stack Overflow pattern)

### Content Cards
- **Prompt Card**: Border-based, not shadow-heavy, with status badge, vote controls, metadata row
- **Technique Card**: Compact design with icon, title, description
- **User Card**: Avatar, username, reputation score, badge preview

### Forms & Inputs
- **Text Input**: Border-2, rounded-lg, focus:ring-2 ring-primary/20
- **Code Editor**: Dark syntax-highlighted blocks with copy button
- **Visual Composer Canvas**: Clean white/dark canvas with minimal chrome, node-based UI

### Interactive Elements
- **Buttons Primary**: bg-primary, hover:bg-primary-hover, rounded-lg, px-4 py-2
- **Buttons Secondary**: border-2 border-primary, text-primary, hover:bg-primary/5
- **Vote Controls**: Vertical arrow buttons (Stack Overflow style) with score between
- **Badges**: Pill-shaped with icon, subtle background colors by category

### Data Display
- **Reputation Graph**: Line chart with gradient fill (using Recharts)
- **Version Timeline**: Vertical timeline with connection lines
- **Review Queue**: List with status indicators and action buttons

### Overlays
- **Modal**: Centered, max-w-2xl, backdrop-blur-sm, slide-up animation
- **Dropdown**: shadow-lg, border, rounded-lg, follows trigger element
- **Toast**: Top-right positioned, slide-in animation, auto-dismiss

---

## Visual Composer Specific Design

**Canvas Area**:
- Background: Dot grid pattern (subtle, 0 0% 92% in light, 215 27% 18% in dark)
- Nodes: Rounded-xl cards with connection handles
- Edges: Smooth bezier curves, 2px width, primary color
- Minimap: Bottom-right corner, semi-transparent

**Node Types**:
- **System Role**: Purple-tinted background (262 40% 95%)
- **Instruction Block**: Blue-tinted (220 40% 95%)
- **Few-Shot Example**: Green-tinted (142 40% 95%)
- **User Input**: Orange-tinted (38 40% 95%)

**Toolbar**: Fixed top, glass-morphism effect (backdrop-blur-md, bg-surface/80)

---

## Animations

**Minimal Philosophy**: Only use animations that enhance usability
- **Page Transitions**: None (instant navigation for speed)
- **Hover States**: Transform scale-[1.02] on cards (duration-200)
- **Loading States**: Subtle pulse on skeletons
- **Vote Feedback**: Number count animation (duration-300)
- **Modal Entry**: Fade + slide-up (duration-200)

---

## Images

**Usage Strategy**:
- **Hero Section**: NO large hero image - start with immediate value proposition and search/browse UI
- **User Avatars**: Circular, 40px default, 64px in profiles
- **Technique Icons**: 24x24 SVG icons from Heroicons (outline style)
- **Empty States**: Simple SVG illustrations (not photos)
- **Tutorial/Documentation**: Annotated screenshots with arrows/highlights

**Rationale**: As a technical platform, visual authenticity comes from the actual UI (Visual Composer, code blocks, graphs) rather than stock imagery. Focus visual budget on functional interfaces.

---

## Responsive Behavior

- **Mobile (<768px)**: Stack all layouts, collapsible sidebar, bottom navigation for key actions
- **Tablet (768-1024px)**: 2-column layouts where appropriate, persistent sidebar
- **Desktop (>1024px)**: Full 3-column layouts, floating toolbars, expanded composer canvas

---

## Accessibility

- WCAG 2.1 AA contrast ratios minimum
- Focus rings: ring-2 ring-primary/50 on all interactive elements
- Screen reader labels for icon-only buttons
- Keyboard navigation support for Visual Composer (arrow keys to navigate nodes)
- Dark mode maintains same contrast ratios as light mode