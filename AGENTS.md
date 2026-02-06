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
- **Customizable Targets**: Adjust budget percentages from default 50/30/20 rule
- **Guided Onboarding**: Step-by-step setup flow at `/onboarding` with review/confirm dialogs
- **Command Palette (`Cmd/Ctrl+K`)**:
  - Quick actions for add/edit/remove/import/share/switch budget
  - Built-in **theme picker** action (light/dark toggle)
  - Built-in **design language picker** (Cyberpunk / Delight)
  - Mounted on dashboard route (`/`) only
- **Design Language System**:
  - **Delight** (default): onboarding-inspired monochrome grid aesthetic with pastel accents
  - **Cyberpunk**: original vivid gradient style
  - Works across dashboard and onboarding routes
- **Interactive Visualizations**:
  - Main pie chart showing budget distribution (Needs/Wants/Savings/Unbudgeted)
  - Drill-down category breakdowns
  - Custom target vs actual comparison with progress bars
  - Future projection chart with itemized/category modes
- **Budget Sharing**: Share budgets via URL or code
  - Compressed, URL-safe encoding using pako (gzip)
  - Shareable links that auto-import when opened
  - Copyable codes for manual import
- **Multi-Budget Storage**: Save and manage multiple budgets locally
  - Save current budget with custom or auto-generated names
  - Load, rename, and delete saved budgets
  - Quick preview of saved budget contents
- **Data Persistence**: Automatic localStorage sync (budget data, saved budgets, design language)
- **Theme + Design Controls**: System-aware dark mode, theme dropdown, and command-palette theme/design switching
- **Responsive Design**: Optimized for desktop, tablet, and mobile
- **Performance Optimized**: Fast animations, memoized calculations, efficient re-renders
- **Analytics & Monitoring**: Vercel Analytics and Speed Insights integration

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
  - `@radix-ui/react-slider`
  - `@radix-ui/react-slot`
  - `@radix-ui/react-visually-hidden`
- **Framer Motion 12.23.26** - Animations
- **Lucide React 0.562.0** - Icons

### Data Visualization

- **Recharts 3.6.0** - Charting library

### State Management

- **React Context API** with `useReducer`
- **localStorage** for persistence

### Theme Management

- **next-themes 0.4.6** - Theme switching
- **Custom design-language context** (`src/lib/design-language-context.tsx`) - Delight/Cyberpunk switching + persistence
- **cmdk 1.1.1** - Command palette surface for theme/design picker actions

### Utilities

- **clsx 2.1.1** - Conditional classnames
- **tailwind-merge 3.4.0** - Tailwind class merging
- **class-variance-authority 0.7.1** - Component variants
- **pako 2.1.0** - Gzip compression for budget sharing

### Development Tools

- **ESLint 9.39.2** with `eslint-config-next`
- **tw-animate-css 1.4.0** - Tailwind animations

### Deployment & Monitoring

- **Vercel** (configured in `vercel.json`)
- **Vercel Analytics 1.6.1** - Web analytics tracking
- **Vercel Speed Insights 1.3.1** - Performance monitoring

## 📁 Project Structure

```
budgeting/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout with ThemeProvider + DesignLanguageProvider
│   │   ├── page.tsx            # Main dashboard page
│   │   ├── onboarding/
│   │   │   └── page.tsx        # Onboarding route entrypoint
│   │   └── globals.css         # Global styles, token system, design-language overrides
│   ├── components/
│   │   ├── ui/                # ShadCN UI components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── slider.tsx
│   │   │   └── textarea.tsx
│   │   ├── budget-column.tsx      # Individual category column
│   │   ├── budget-columns.tsx     # Grid of all columns
│   │   ├── budget-input.tsx       # Add/edit form
│   │   ├── budget-manager.tsx     # Multi-budget save/load UI
│   │   ├── budget-pie-chart.tsx   # Main pie chart
│   │   ├── budget-projection-card.tsx # Future projection visualization
│   │   ├── category-breakdown.tsx # Drill-down view
│   │   ├── command-palette/
│   │   │   ├── index.tsx          # Cmd/Ctrl+K command palette (dashboard-only mount)
│   │   │   ├── components/        # Palette subviews/forms
│   │   │   ├── constants.ts       # Palette icon/category constants
│   │   │   ├── hooks/             # Palette data hooks
│   │   │   └── types.ts           # Palette mode/view types
│   │   ├── import-budget-dialog.tsx  # Import shared budget dialog
│   │   ├── onboarding/
│   │   │   └── onboarding-flow.tsx # Guided onboarding flow UI
│   │   ├── share-budget-dialog.tsx   # Share budget dialog
│   │   ├── target-settings.tsx     # Customize budget targets
│   │   ├── theme-provider.tsx     # Theme context wrapper
│   │   └── theme-toggle.tsx       # Theme switcher component
│   ├── lib/
│   │   ├── budget-context.tsx     # Global state management
│   │   ├── budget-serialization.ts # Encode/decode for sharing
│   │   ├── budget-storage.ts      # Multi-budget localStorage
│   │   ├── design-language-context.tsx # Design language state + persistence
│   │   ├── design-language.ts     # Design language types + color mappings
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

### `next.config.ts`

- **React Strict Mode**: Enabled
- **Security Headers**: Configured (X-Frame-Options, CSP, HSTS, etc.)
- **Powered By Header**: Disabled
- **Metadata**: Comprehensive SEO metadata with OpenGraph and Twitter cards

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
4. **Test** in both light and dark modes and both design languages (Delight/Cyberpunk)
5. **Verify** localStorage persistence (`budget-planner-data`, `budget-planner-saved-budgets`, `budget-planner-design-language`)
6. run `bun lint` to check for errors and fix them
7. run `bun build` to build the application for production and see if there are any erros

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

- **State Structure**: `BudgetState` with categories, selected category, and target percentages
- **Actions**: ADD_ITEM, REMOVE_ITEM, UPDATE_ITEM, SET_SELECTED_CATEGORY, UPDATE_TARGET_PERCENTAGES, CLEAR_ALL, LOAD_FROM_STORAGE, IMPORT_BUDGET
- **Persistence**: Automatic localStorage sync (client-side only)
- **Hydration**: Uses `useSyncExternalStore` to prevent SSR/client mismatches
- **Performance**: All context functions are memoized with `useCallback`

**Key Functions**:

- `getTotalIncome()` - Sum of all income items
- `getTotalBudgeted()` - Sum of needs/wants/savings
- `getUnbudgetedAmount()` - Remaining unbudgeted income
- `getPercentageByCategory()` - Percentage of income for each category
- `getPercentageOfIncome()` - Percentage of income for spending categories
- `getTargetPercentage()` - Get target percentage for a category
- `updateTargetPercentages()` - Update custom target percentages
- `resetTargetPercentages()` - Reset to default 50/30/20 targets
- `importBudget(data)` - Import a serialized budget (from sharing)
- `exportBudget()` - Export current budget as serialized format

### Design Language State Management

**Locations**: `src/lib/design-language-context.tsx`, `src/lib/design-language.ts`

The application uses a dedicated context for UI design language selection:

- **Type**: `DesignLanguage = "cyberpunk" | "delight"`
- **Default**: `delight`
- **Persistence Key**: `"budget-planner-design-language"`
- **Hydration-safe reads**: `useSyncExternalStore` + pre-hydration inline script in `layout.tsx`
- **DOM Sync**: sets `document.documentElement.dataset.designLanguage` for CSS token overrides
- **Primary API**:
  - `useDesignLanguage()` hook
  - `setDesignLanguage("cyberpunk" | "delight")`
  - `getCategoryColor(category, designLanguage)`
  - `getItemizedCategoryPalette(category, designLanguage)`

### Type System

**Location**: `src/types/budget.ts`

- `BudgetItem`: `{ id: string, label: string, amount: number }`
- `CategoryName`: `"needs" | "wants" | "savings" | "income"`
- `SpendingCategoryName`: `"needs" | "wants" | "savings"`
- `BudgetCategory`: Category with items, target percentage, and color
- `TargetPercentages`: Record of custom target percentages for spending categories
- `BudgetState`: Complete application state (includes categories, targetPercentages, selectedCategory)
- `CATEGORY_CONFIG`: Default colors, labels, and target percentages
- `SerializedBudget`: Compact format for sharing (items without IDs, optional targets)
- `SerializedBudgetItem`: `{ label: string, amount: number }` (no ID for sharing)
- `SavedBudget`: Stored budget with id, name, timestamps, and serialized data

### Component Architecture

#### Layout Structure

```
RootLayout (layout.tsx)
  └── ThemeProvider
      └── DesignLanguageProvider
          ├── / (Dashboard route)
          │   └── BudgetProvider (budget-context.tsx)
          │       └── BudgetDashboard (page.tsx)
          │           ├── Header (ThemeToggle, CommandPaletteButton, Share/Import/Clear actions)
          │           ├── Row 1: ChartSection | BudgetComparison
          │           ├── Row 2: BudgetColumns (Income | Needs | Wants | Savings)
          │           ├── BudgetProjectionCard
          │           ├── TargetSettings
          │           ├── BudgetManager
          │           └── CommandPalette (mounted on dashboard only)
          └── /onboarding route
              └── BudgetProvider
                  └── OnboardingFlow
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
   - Custom target vs actual comparison (uses current target percentages)
   - Progress bars with target indicators
   - Unbudgeted income display
   - Shows difference from target with color-coded badges

6. **TargetSettings** (`target-settings.tsx`)
   - Collapsible panel for customizing budget targets
   - Slider and input controls for each category
   - Validation ensures percentages total 100%
   - Reset to default 50/30/20
   - Evenly distribute remaining percentage feature
   - Visual feedback with success messages

7. **ShareBudgetDialog** (`share-budget-dialog.tsx`)
   - Modal dialog for sharing current budget
   - Generates shareable URL with encoded budget data
   - Generates copyable code string
   - Copy buttons with visual feedback

8. **ImportBudgetDialog** (`import-budget-dialog.tsx`)
   - Modal dialog for importing shared budgets
   - Accepts pasted codes or auto-detects URL parameter
   - Shows preview of budget before importing
   - Validates codes and shows error messages

9. **BudgetManager** (`budget-manager.tsx`)
   - Collapsible panel for managing saved budgets
   - Save current budget with custom or auto-generated name
   - List saved budgets with load/rename/delete actions
   - Shows budget summary (income, item counts)

10. **BudgetProjectionCard** (`budget-projection-card.tsx`)
   - Forecast view for cumulative spending, savings, and projected net worth
   - Supports itemized/category breakdown and advanced assumptions

11. **CommandPalette** (`command-palette/index.tsx`)
   - Keyboard-first command center (`Cmd/Ctrl+K`) for budget actions
   - Includes **theme picker action** and **design language picker action**
   - Contains nested subviews for add/edit/import/share/rename/switch
   - Mounted on dashboard route only

12. **OnboardingFlow** (`onboarding/onboarding-flow.tsx`)
   - Multi-step guided setup with save/replace guards
   - Shares the same design language system as dashboard
   - Supports both Delight and Cyberpunk in light/dark modes

### Serialization System

**Location**: `src/lib/budget-serialization.ts`

The sharing system uses compression and URL-safe encoding:

- `serializeBudget(state)` - Convert state to compact JSON (strips IDs)
- `encodeBudget(state)` - Compress with pako + base64url encode
- `decodeBudget(code)` - Decode and decompress shared code
- `generateShareUrl(state)` - Create full URL with `?budget=` param
- `getBudgetCodeFromUrl()` - Extract code from URL parameter
- `clearBudgetFromUrl()` - Remove param without page reload
- `getBudgetPreview(data)` - Get summary of serialized budget

### Multi-Budget Storage

**Location**: `src/lib/budget-storage.ts`

**Storage Key**: `"budget-planner-saved-budgets"`

- `getSavedBudgets()` - Load all saved budgets array
- `saveBudgetToStorage(state, name?)` - Save current budget
- `saveSerializedBudgetToStorage(data, name?)` - Save imported budget
- `getSavedBudgetById(id)` - Get specific saved budget
- `updateSavedBudget(id, state)` - Update existing saved budget
- `renameSavedBudget(id, newName)` - Rename a saved budget
- `deleteSavedBudget(id)` - Delete a saved budget
- `generateBudgetName()` - Auto-generate name with timestamp

### Styling System

**Location**: `src/app/globals.css`

- **CSS Variables**: OKLCH color space for better color manipulation
- **Dark Mode**: `.dark` class via `next-themes`
- **Design Language Overrides**:
  - `html[data-design-language="delight"]`
  - `html.dark[data-design-language="delight"]`
  - Includes Delight grid background, card/button/input/dialog/dropdown slot overrides
- **Custom Variant**: `@custom-variant dark` for Tailwind
- **Theme Tokens**: Defined in `:root`, `.dark`, and design-language selector blocks

**Category Accent Palettes**:

- **Cyberpunk**:
  - Needs: `#ef4444`
  - Wants: `#3b82f6`
  - Savings: `#22c55e`
  - Income: `#8b5cf6`
- **Delight** (pastel accents):
  - Needs: `#c8887f`
  - Wants: `#7f9fc8`
  - Savings: `#79ae90`
  - Income: `#a893c9`
- **Unbudgeted** segment uses neutral gray/slate and differs per design language

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

**Current Budget Storage Key**: `"budget-planner-data"`

**Format**: JSON stringified object containing:
- `categories`: Items for each category (needs, wants, savings, income)
- `targetPercentages`: Custom target percentages (if modified from defaults)
- `currentBudgetName`: Optional current budget display name

**Hydration Strategy**:

1. Server renders with empty initial state
2. Client hydrates and checks localStorage
3. If data exists, dispatches `LOAD_FROM_STORAGE` action
4. Subsequent changes auto-save to localStorage
5. Custom target percentages are persisted and restored

**Design Language Storage Key**: `"budget-planner-design-language"`

- Accepted values: `"delight"` or `"cyberpunk"`
- Missing/invalid values fallback to default (`"delight"`)
- Root layout sets `data-design-language` pre-hydration to reduce flash of wrong style

**Saved Budgets Storage Key**: `"budget-planner-saved-budgets"`

**Format**: JSON array of `SavedBudget` objects, each containing:
- `id`: Unique identifier (UUID)
- `name`: User-provided or auto-generated name
- `createdAt`: ISO timestamp
- `lastModifiedAt`: ISO timestamp
- `data`: SerializedBudget (compact format without IDs)

**URL Sharing**:
- Budgets can be shared via URL with `?budget=<encoded_data>` parameter
- On page load, if URL contains budget param, ImportBudgetDialog opens automatically
- After import or cancel, the URL parameter is cleared without page reload

**Important**: Always check `isHydrated` before rendering components that depend on localStorage.

## 🎨 Design System

### Typography

- **Primary Font**: Space Grotesk (weights: 400, 500, 600, 700)
- **Serif Display Font**: Libre Baskerville (weights: 400, 700)
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
5. Update `TargetPercentages` type if it's a spending category
6. Update `TargetSettings` component if it should be customizable
7. Update grid layout if needed

### Modifying Animation Speeds

Look for `transition={{ duration: X }}` in components:

- **Interactive elements**: 0.12s - 0.15s
- **Page load**: 0.3s - 0.5s
- **Delays**: 0.02s - 0.05s per item

### Changing Colors

1. For semantic category accents, update mappings in `src/lib/design-language.ts` (`getCategoryColor`, `getItemizedCategoryPalette`)
2. Keep `CATEGORY_CONFIG` colors for backward compatibility; avoid using them directly for themed UI accents
3. Update design-language token overrides in `src/app/globals.css` (`html[data-design-language="delight"]`, `html.dark[data-design-language="delight"]`)
4. Ensure contrast ratios meet accessibility standards in both design languages and light/dark modes

### Modifying Target Percentages

1. Default targets are in `CATEGORY_CONFIG` in `src/types/budget.ts`
2. Users can customize via `TargetSettings` component
3. Custom targets are stored in `state.targetPercentages` and persisted to localStorage
4. Always use `getTargetPercentage()` from context, not `CATEGORY_CONFIG` directly
5. The `BudgetComparison` component automatically uses current targets

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

### Import Paths

**MUST**: Always use absolute imports with the `@/` alias for internal modules. This ensures consistency, prevents build issues, and makes refactoring easier.

**Correct**:
```typescript
import { useBudget } from "@/lib/budget-context";
import { BudgetColumn } from "@/components/budget-column";
import { formatCurrency } from "@/lib/utils";
import { BudgetItem } from "@/types/budget";
```

**Incorrect** (relative imports):
```typescript
import { useBudget } from "./budget-context";  // ❌ Don't use relative imports
import { BudgetColumn } from "./budget-column";  // ❌ Don't use relative imports
```

**Why**: 
- Relative imports (`./` or `../`) can break during builds, especially with Turbopack and module resolution
- Absolute imports with `@/` alias are more maintainable and consistent
- The `@/` alias is configured in `tsconfig.json` to point to `./src/*`
- This pattern is used throughout the codebase and is required for Vercel builds

**Exception**: Only use relative imports for files in the same directory when importing from sibling files in a tightly-coupled module (rare).

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

**Last Updated**: February 2026

---

## 🤖 For AI Agents

When working on this codebase:

1. **Always check** `isHydrated` before accessing localStorage
2. **Use Bun** commands, not npm/yarn
3. **Follow** existing animation patterns (fast for interactive, slower for initial load)
4. **Memoize** expensive calculations and callbacks
5. **Test** in both light and dark modes **and** both design languages (Delight/Cyberpunk)
6. **Verify** localStorage persistence after changes (including custom targets and `budget-planner-design-language`)
7. **Maintain** TypeScript strict mode compliance
8. **Use** existing UI components from `src/components/ui/` when possible
9. **Follow** the established file structure
10. **Update** this document if adding significant features or changing architecture
11. **Remember** that target percentages are customizable - don't hardcode 50/30/20
12. **Use** `getTargetPercentage()` to get current targets, not `CATEGORY_CONFIG`
13. **For category colors**, use `getCategoryColor(...)` / `getItemizedCategoryPalette(...)` with current design language
14. **Command palette scope**: keep `Cmd/Ctrl+K` mounted on dashboard route unless intentionally expanded

When making changes:

- Read related files to understand context
- Check for existing patterns before creating new ones
- Ensure animations feel snappy for power users
- Maintain accessibility (ARIA labels, keyboard navigation)
- Keep bundle size in mind (prefer tree-shakeable imports)
- Always run `bun lint` and `bun run build` before committing, and make sure both succeed before additional testing.


# Vercel Guidelines 
Concise rules for building accessible, fast, delightful UIs. Use MUST/SHOULD/NEVER to guide decisions.

## Interactions

### Keyboard

- MUST: Full keyboard support per [WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/patterns/)
- MUST: Visible focus rings (`:focus-visible`; group with `:focus-within`)
- MUST: Manage focus (trap, move, return) per APG patterns
- NEVER: `outline: none` without visible focus replacement

### Targets & Input

- MUST: Hit target ≥24px (mobile ≥44px); if visual <24px, expand hit area
- MUST: Mobile `<input>` font-size ≥16px to prevent iOS zoom
- NEVER: Disable browser zoom (`user-scalable=no`, `maximum-scale=1`)
- MUST: `touch-action: manipulation` to prevent double-tap zoom
- SHOULD: Set `-webkit-tap-highlight-color` to match design

### Forms

- MUST: Hydration-safe inputs (no lost focus/value)
- NEVER: Block paste in `<input>`/`<textarea>`
- MUST: Loading buttons show spinner and keep original label
- MUST: Enter submits focused input; in `<textarea>`, ⌘/Ctrl+Enter submits
- MUST: Keep submit enabled until request starts; then disable with spinner
- MUST: Accept free text, validate after—don't block typing
- MUST: Allow incomplete form submission to surface validation
- MUST: Errors inline next to fields; on submit, focus first error
- MUST: `autocomplete` + meaningful `name`; correct `type` and `inputmode`
- SHOULD: Disable spellcheck for emails/codes/usernames
- SHOULD: Placeholders end with `…` and show example pattern
- MUST: Warn on unsaved changes before navigation
- MUST: Compatible with password managers & 2FA; allow pasting codes
- MUST: Trim values to handle text expansion trailing spaces
- MUST: No dead zones on checkboxes/radios; label+control share one hit target

### State & Navigation

- MUST: URL reflects state (deep-link filters/tabs/pagination/expanded panels)
- MUST: Back/Forward restores scroll position
- MUST: Links use `<a>`/`<Link>` for navigation (support Cmd/Ctrl/middle-click)
- NEVER: Use `<div onClick>` for navigation

### Feedback

- SHOULD: Optimistic UI; reconcile on response; on failure rollback or offer Undo
- MUST: Confirm destructive actions or provide Undo window
- MUST: Use polite `aria-live` for toasts/inline validation
- SHOULD: Ellipsis (`…`) for options opening follow-ups ("Rename…") and loading states ("Loading…")

### Touch & Drag

- MUST: Generous targets, clear affordances; avoid finicky interactions
- MUST: Delay first tooltip; subsequent peers instant
- MUST: `overscroll-behavior: contain` in modals/drawers
- MUST: During drag, disable text selection and set `inert` on dragged elements
- MUST: If it looks clickable, it must be clickable

### Autofocus

- SHOULD: Autofocus on desktop with single primary input; rarely on mobile

## Animation

- MUST: Honor `prefers-reduced-motion` (provide reduced variant or disable)
- SHOULD: Prefer CSS > Web Animations API > JS libraries
- MUST: Animate compositor-friendly props (`transform`, `opacity`) only
- NEVER: Animate layout props (`top`, `left`, `width`, `height`)
- NEVER: `transition: all`—list properties explicitly
- SHOULD: Animate only to clarify cause/effect or add deliberate delight
- SHOULD: Choose easing to match the change (size/distance/trigger)
- MUST: Animations interruptible and input-driven (no autoplay)
- MUST: Correct `transform-origin` (motion starts where it "physically" should)
- MUST: SVG transforms on `<g>` wrapper with `transform-box: fill-box`

## Layout

- SHOULD: Optical alignment; adjust ±1px when perception beats geometry
- MUST: Deliberate alignment to grid/baseline/edges—no accidental placement
- SHOULD: Balance icon/text lockups (weight/size/spacing/color)
- MUST: Verify mobile, laptop, ultra-wide (simulate ultra-wide at 50% zoom)
- MUST: Respect safe areas (`env(safe-area-inset-*)`)
- MUST: Avoid unwanted scrollbars; fix overflows
- SHOULD: Flex/grid over JS measurement for layout

## Content & Accessibility

- SHOULD: Inline help first; tooltips last resort
- MUST: Skeletons mirror final content to avoid layout shift
- MUST: `<title>` matches current context
- MUST: No dead ends; always offer next step/recovery
- MUST: Design empty/sparse/dense/error states
- SHOULD: Curly quotes (" "); avoid widows/orphans (`text-wrap: balance`)
- MUST: `font-variant-numeric: tabular-nums` for number comparisons
- MUST: Redundant status cues (not color-only); icons have text labels
- MUST: Accessible names exist even when visuals omit labels
- MUST: Use `…` character (not `...`)
- MUST: `scroll-margin-top` on headings; "Skip to content" link; hierarchical `<h1>`–`<h6>`
- MUST: Resilient to user-generated content (short/avg/very long)
- MUST: Locale-aware dates/times/numbers (`Intl.DateTimeFormat`, `Intl.NumberFormat`)
- MUST: Accurate `aria-label`; decorative elements `aria-hidden`
- MUST: Icon-only buttons have descriptive `aria-label`
- MUST: Prefer native semantics (`button`, `a`, `label`, `table`) before ARIA
- MUST: Non-breaking spaces: `10&nbsp;MB`, `⌘&nbsp;K`, brand names

## Content Handling

- MUST: Text containers handle long content (`truncate`, `line-clamp-*`, `break-words`)
- MUST: Flex children need `min-w-0` to allow truncation
- MUST: Handle empty states—no broken UI for empty strings/arrays

## Performance

- SHOULD: Test iOS Low Power Mode and macOS Safari
- MUST: Measure reliably (disable extensions that skew runtime)
- MUST: Track and minimize re-renders (React DevTools/React Scan)
- MUST: Profile with CPU/network throttling
- MUST: Batch layout reads/writes; avoid reflows/repaints
- MUST: Mutations (`POST`/`PATCH`/`DELETE`) target <500ms
- SHOULD: Prefer uncontrolled inputs; controlled inputs cheap per keystroke
- MUST: Virtualize large lists (>50 items)
- MUST: Preload above-fold images; lazy-load the rest
- MUST: Prevent CLS (explicit image dimensions)
- SHOULD: `<link rel="preconnect">` for CDN domains
- SHOULD: Critical fonts: `<link rel="preload" as="font">` with `font-display: swap`

## Dark Mode & Theming

- MUST: `color-scheme: dark` on `<html>` for dark themes
- SHOULD: `<meta name="theme-color">` matches page background
- MUST: Native `<select>`: explicit `background-color` and `color` (Windows fix)

## Hydration

- MUST: Inputs with `value` need `onChange` (or use `defaultValue`)
- SHOULD: Guard date/time rendering against hydration mismatch

## Design

- SHOULD: Layered shadows (ambient + direct)
- SHOULD: Crisp edges via semi-transparent borders + shadows
- SHOULD: Nested radii: child ≤ parent; concentric
- SHOULD: Hue consistency: tint borders/shadows/text toward bg hue
- MUST: Accessible charts (color-blind-friendly palettes)
- MUST: Meet contrast—prefer [APCA](https://apcacontrast.com/) over WCAG 2
- MUST: Increase contrast on `:hover`/`:active`/`:focus`
- SHOULD: Match browser UI to bg
- SHOULD: Avoid dark color gradient banding (use background images when needed)
