# AGENTS.md - Oversight - Budget Planner Project Guide

This document provides comprehensive information for AI agents, developers, and contributors working on the Oversight - Budget Planner application.

## 📋 Project Overview

**Oversight - Budget Planner** is a modern, interactive web application that helps users manage their finances using the **50/30/20 budgeting rule**:

- **50%** of income for Needs (essential expenses)
- **30%** of income for Wants (discretionary spending)
- **20%** of income for Savings

The application provides real-time visualization, income tracking, and detailed breakdowns to help users understand their spending patterns and stay within budget targets.

### Key Features

- **Income Tracking**: Multiple income sources with real-time totals
- **Category Management**: Add, edit, and remove items across Needs, Wants, and Savings
- **Interactive Visualizations**:
  - Main pie chart showing budget distribution (Needs/Wants/Savings/Unbudgeted)
  - Drill-down category breakdowns
  - 50/30/20 comparison with progress bars
- **Data Persistence**: Automatic localStorage sync
- **Dark Mode**: System-aware theme with manual override
- **Responsive Design**: Optimized for desktop, tablet, and mobile
- **Performance Optimized**: Fast animations, memoized calculations, efficient re-renders

## 🛠 Tech Stack

### Core Framework & Runtime

- **Next.js 16.1.0** (App Router, Turbopack)
- **React 19.2.3** with React DOM 19.2.3
- **Bun 1.3.5** (Runtime & Package Manager)
- **TypeScript 5.9.3**

### Styling & UI

- **Tailwind CSS v4.1.18** (with PostCSS)
- **ShadCN/UI** (New York style) - Component library
- **Radix UI** - Accessible primitives:
  - `@radix-ui/react-dialog`
  - `@radix-ui/react-dropdown-menu`
  - `@radix-ui/react-label`
  - `@radix-ui/react-slot`
- **Framer Motion 12.23.26** - Animations
- **Lucide React 0.562.0** - Icons

### Data Visualization

- **Recharts 3.6.0** - Charting library

### State Management

- **React Context API** with `useReducer`
- **localStorage** for persistence

### Theme Management

- **next-themes 0.4.6** - Theme switching

### Utilities

- **clsx 2.1.1** - Conditional classnames
- **tailwind-merge 3.4.0** - Tailwind class merging
- **class-variance-authority 0.7.1** - Component variants

### Development Tools

- **ESLint 9.39.2** with `eslint-config-next`
- **tw-animate-css 1.4.0** - Tailwind animations

### Deployment

- **Vercel** (configured in `vercel.json`)
- **Vercel Analytics** for tracking

## 📁 Project Structure

```
budgeting/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx         # Root layout with ThemeProvider
│   │   ├── page.tsx           # Main dashboard page
│   │   └── globals.css        # Global styles & theme variables
│   ├── components/
│   │   ├── ui/                # ShadCN UI components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── input.tsx
│   │   │   └── label.tsx
│   │   ├── budget-column.tsx      # Individual category column
│   │   ├── budget-columns.tsx     # Grid of all columns
│   │   ├── budget-input.tsx       # Add/edit form
│   │   ├── budget-pie-chart.tsx   # Main pie chart
│   │   ├── category-breakdown.tsx # Drill-down view
│   │   ├── theme-provider.tsx     # Theme context wrapper
│   │   └── theme-toggle.tsx       # Theme switcher component
│   ├── lib/
│   │   ├── budget-context.tsx     # Global state management
│   │   └── utils.ts               # Utility functions (cn, formatCurrency)
│   └── types/
│       └── budget.ts              # TypeScript type definitions
├── public/                        # Static assets
├── .nvmrc                         # Node version (24.12.0)
├── components.json                 # ShadCN configuration
├── next.config.ts                  # Next.js configuration
├── package.json                    # Dependencies & scripts
├── postcss.config.mjs              # PostCSS configuration
├── tsconfig.json                   # TypeScript configuration
├── vercel.json                     # Vercel deployment config
└── README.md                       # User-facing documentation
```

## ⚙️ Configuration Files

### `package.json`

- **Package Manager**: Bun 1.3.5 (enforced)
- **Scripts**:
  - `bun dev` - Development server (Turbopack)
  - `bun run build` - Production build
  - `bun run start` - Production server
  - `bun run lint` - ESLint check

### `vercel.json`

- **Framework**: Next.js
- **Runtime**: Bun 1.x
- **Region**: iad1 (US East)
- **Commands**: All use `bun` instead of `npm`

### `tsconfig.json`

- **Target**: ES2017
- **Module**: ESNext
- **JSX**: react-jsx
- **Path Aliases**: `@/*` → `./src/*`
- **Strict Mode**: Enabled

### `components.json` (ShadCN)

- **Style**: New York
- **RSC**: Enabled (React Server Components)
- **Base Color**: Neutral
- **CSS Variables**: Enabled
- **Icon Library**: Lucide
- **Component Path**: `@/components/ui`
- **Utils Path**: `@/lib/utils`

### `.nvmrc`

- **Node Version**: 24.12.0
- **Note**: Use `nvm use` before running commands if using nvm

## 🚀 Development Environment Setup

### Prerequisites

1. **Bun** v1.3.5+ ([Installation Guide](https://bun.sh))
2. **Node.js** v24.12.0+ (or use nvm: `nvm use`)
3. **Git** (for version control)

### Initial Setup

```bash
# Clone the repository (if applicable)
git clone <repository-url>
cd budgeting

# Install dependencies
bun install

# Start development server
bun dev
```

The application will be available at `http://localhost:3000`

### Development Workflow

1. **Make changes** to files in `src/`
2. **Hot reload** is automatic (Turbopack)
3. **Check for errors** in terminal and browser console
4. **Test** in both light and dark modes
5. **Verify** localStorage persistence

### Building for Production

```bash
# Create optimized production build
bun run build

# Test production build locally
bun run start
```

### Linting

```bash
# Run ESLint
bun run lint
```

## 🏗 Architecture & Patterns

### State Management

**Location**: `src/lib/budget-context.tsx`

The application uses React Context API with `useReducer` for global state:

- **State Structure**: `BudgetState` with categories and selected category
- **Actions**: ADD_ITEM, REMOVE_ITEM, UPDATE_ITEM, SET_SELECTED_CATEGORY, CLEAR_ALL, LOAD_FROM_STORAGE
- **Persistence**: Automatic localStorage sync (client-side only)
- **Hydration**: Uses `useSyncExternalStore` to prevent SSR/client mismatches
- **Performance**: All context functions are memoized with `useCallback`

**Key Functions**:

- `getTotalIncome()` - Sum of all income items
- `getTotalBudgeted()` - Sum of needs/wants/savings
- `getUnbudgetedAmount()` - Remaining unbudgeted income
- `getPercentageByCategory()` - Percentage of income for each category

### Type System

**Location**: `src/types/budget.ts`

- `BudgetItem`: `{ id: string, label: string, amount: number }`
- `CategoryName`: `"needs" | "wants" | "savings" | "income"`
- `SpendingCategoryName`: `"needs" | "wants" | "savings"`
- `BudgetCategory`: Category with items, target percentage, and color
- `BudgetState`: Complete application state
- `CATEGORY_CONFIG`: Default colors, labels, and target percentages

### Component Architecture

#### Layout Structure

```
RootLayout (layout.tsx)
  └── ThemeProvider
      └── BudgetProvider (budget-context.tsx)
          └── BudgetDashboard (page.tsx)
              ├── Header (with ThemeToggle, ClearButton)
              ├── Row 1: ChartSection | BudgetComparison
              └── Row 2: BudgetColumns (Income | Needs | Wants | Savings)
```

#### Key Components

1. **BudgetColumn** (`budget-column.tsx`)

   - Displays items for a single category
   - Handles add/edit/remove operations
   - Shows total and percentage
   - Inline editing on click

2. **BudgetInput** (`budget-input.tsx`)

   - Reusable form for adding/editing items
   - Validates input (label + positive amount)
   - Auto-focuses on mount

3. **BudgetPieChart** (`budget-pie-chart.tsx`)

   - Main visualization showing 4 segments
   - Handles click-to-drill-down
   - Custom tooltips with income-based percentages

4. **CategoryBreakdown** (`category-breakdown.tsx`)

   - Detailed view of selected category
   - Shows individual items as pie chart
   - Back button to return to main view

5. **BudgetComparison** (`page.tsx`)
   - 50/30/20 target vs actual comparison
   - Progress bars with target indicators
   - Unbudgeted income display

### Styling System

**Location**: `src/app/globals.css`

- **CSS Variables**: OKLCH color space for better color manipulation
- **Dark Mode**: `.dark` class with blue-tinted cards
- **Custom Variant**: `@custom-variant dark` for Tailwind
- **Theme Colors**: Defined in `:root` and `.dark` selectors

**Color Scheme**:

- Needs: `#ef4444` (Red)
- Wants: `#3b82f6` (Blue)
- Savings: `#22c55e` (Green)
- Income: `#8b5cf6` (Purple)
- Unbudgeted: `#d1d5db` (Gray)

### Animation System

**Library**: Framer Motion 12.23.26

**Performance Optimizations**:

- Fast animations for interactive elements (0.12s - 0.15s)
- Slower animations for initial page load (0.3s - 0.5s)
- Staggered delays for list items (0.02s - 0.05s per item)
- `AnimatePresence` for mount/unmount animations
- `layout` prop for automatic layout animations

**Key Animation Patterns**:

- Button → Form transition: 0.06s exit + 0.1s enter
- Item add/remove: 0.12s with minimal delay
- Chart transitions: 0.15s
- Theme toggle: 0.15s

### Data Persistence

**Storage Key**: `"budget-planner-data"`

**Format**: JSON stringified `BudgetState`

**Hydration Strategy**:

1. Server renders with empty initial state
2. Client hydrates and checks localStorage
3. If data exists, dispatches `LOAD_FROM_STORAGE` action
4. Subsequent changes auto-save to localStorage

**Important**: Always check `isHydrated` before rendering components that depend on localStorage.

## 🎨 Design System

### Typography

- **Primary Font**: Space Grotesk (weights: 300, 400, 500, 600, 700)
- **Monospace Font**: JetBrains Mono (weights: 400, 500)
- **Display**: `swap` for better perceived performance

### Spacing & Layout

- **Container**: `max-w-7xl` with `mx-auto px-4`
- **Grid**: Responsive with `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`
- **Gaps**: `gap-4` for cards, `gap-6` for sections

### Component Patterns

**Cards**:

- Rounded corners: `rounded-xl`
- Border: `border` with category color on top
- Shadow: `shadow-sm` (light), `shadow-lg` (dark mode)
- Padding: `py-6` vertical, `px-6` horizontal

**Buttons**:

- Variants: `default`, `outline`, `ghost`, `destructive`
- Sizes: `sm`, `default`, `lg`
- Category-colored borders for "Add Item" buttons

**Forms**:

- Input height: `h-8` or `h-9`
- Label: `text-xs font-medium`
- Background: `bg-muted/50` for input containers

## 🔧 Common Tasks & Patterns

### Adding a New Category

1. Update `CategoryName` type in `src/types/budget.ts`
2. Add config to `CATEGORY_CONFIG`
3. Update `initialState` in `budget-context.tsx`
4. Add to `CATEGORIES` array in `budget-columns.tsx`
5. Update grid layout if needed

### Modifying Animation Speeds

Look for `transition={{ duration: X }}` in components:

- **Interactive elements**: 0.12s - 0.15s
- **Page load**: 0.3s - 0.5s
- **Delays**: 0.02s - 0.05s per item

### Changing Colors

1. Update `CATEGORY_CONFIG` in `src/types/budget.ts`
2. Update dark mode card colors in `src/app/globals.css` (`.dark` selector)
3. Ensure contrast ratios meet accessibility standards

### Adding New Chart Types

1. Import from `recharts`
2. Follow pattern in `budget-pie-chart.tsx`
3. Use `ResponsiveContainer` for responsiveness
4. Add custom tooltips if needed

### Debugging State Issues

1. Check `isHydrated` status
2. Verify localStorage data format
3. Check `budget-context.tsx` reducer logic
4. Use React DevTools to inspect context state

## 🐛 Known Issues & Considerations

### Hydration Mismatches

- **Solution**: Always use `isHydrated` check before rendering localStorage-dependent UI
- **Pattern**: `if (!isHydrated) return null;` or render placeholder

### Performance

- All expensive calculations are memoized
- Components use `React.memo` where appropriate
- List items use minimal animation delays

### Browser Compatibility

- Requires modern browser with localStorage support
- Uses CSS custom properties (OKLCH) - may need fallbacks for older browsers

## 🚢 Deployment

### Vercel Configuration

**File**: `vercel.json`

- **Framework**: Next.js (auto-detected)
- **Runtime**: Bun 1.x
- **Region**: iad1 (US East)
- **Build Command**: `bun run build`
- **Install Command**: `bun install`

### Environment Variables

Currently none required. If adding:

1. Add to Vercel dashboard
2. Create `.env.local` for local development
3. Document in this file

### Domain

- **Production Domain**: `oversight.finance`
- Configured in Vercel dashboard

## 📝 Code Style & Conventions

### TypeScript

- **Strict Mode**: Enabled
- **Naming**: PascalCase for components, camelCase for functions
- **Types**: Prefer interfaces over types for object shapes
- **Exports**: Named exports preferred

### React Patterns

- **Client Components**: Use `"use client"` directive
- **Server Components**: Default (no directive)
- **Hooks**: Custom hooks in `src/hooks/` (if created)
- **Memoization**: Use `useMemo` and `useCallback` for expensive operations

### File Organization

- **Components**: One component per file
- **Types**: Centralized in `src/types/`
- **Utils**: Shared utilities in `src/lib/utils.ts`
- **Styles**: Global styles in `src/app/globals.css`

### Import Order

1. React/Next.js imports
2. Third-party libraries
3. Internal components
4. Types
5. Utils
6. Styles (if needed)

## 🔍 Testing Strategy

Currently no automated tests. For adding tests:

1. **Unit Tests**: Jest or Vitest for utilities
2. **Component Tests**: React Testing Library
3. **E2E Tests**: Playwright or Cypress
4. **Visual Regression**: Chromatic or Percy

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Bun Documentation](https://bun.sh/docs)
- [ShadCN/UI Components](https://ui.shadcn.com)
- [Framer Motion Docs](https://www.framer.com/motion/)
- [Recharts Documentation](https://recharts.org)
- [Tailwind CSS v4 Docs](https://tailwindcss.com/docs)

## 👤 Author & Maintenance

**Author**: Ali Shariatmadari

**Project Status**: Active Development

**Last Updated**: 2024

---

## 🤖 For AI Agents

When working on this codebase:

1. **Always check** `isHydrated` before accessing localStorage
2. **Use Bun** commands, not npm/yarn
3. **Follow** existing animation patterns (fast for interactive, slower for initial load)
4. **Memoize** expensive calculations and callbacks
5. **Test** in both light and dark modes
6. **Verify** localStorage persistence after changes
7. **Maintain** TypeScript strict mode compliance
8. **Use** existing UI components from `src/components/ui/` when possible
9. **Follow** the established file structure
10. **Update** this document if adding significant features or changing architecture

When making changes:

- Read related files to understand context
- Check for existing patterns before creating new ones
- Ensure animations feel snappy for power users
- Maintain accessibility (ARIA labels, keyboard navigation)
- Keep bundle size in mind (prefer tree-shakeable imports)
