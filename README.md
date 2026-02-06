# Oversight - Budget Planner

A modern budgeting web application that helps you track expenses using the **50/30/20 rule** (50% Needs, 30% Wants, 20% Savings).

## Features

- **Three-category budgeting** - Organize expenses into Needs, Wants, and Savings
- **Interactive pie charts** - Visualize budget breakdown with drill-down analysis
- **Real-time calculations** - Automatic totals and percentage tracking
- **Target comparison** - Visual progress bars comparing actual vs. target percentages
- **Command palette** - Quick save/switch/rename/delete saved budget flows via `Cmd/Ctrl+K`
- **Persistent storage** - In-memory UI state with debounced localStorage persistence (`oversight-current-budget-v2`, `oversight-saved-budgets-v2`, `oversight-app-meta-v2`)
- **Dark mode** - Automatic theme switching
- **Responsive design** - Optimized for all devices

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.1.0+
- Node.js v20.9.0+

### Installation

```bash
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000)

### Production

```bash
bun run build
bun run start
```

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Runtime**: Bun
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI**: ShadCN/UI (Radix UI)
- **Charts**: Recharts
- **State**: React Context API

## Deployment

Configured for Vercel with Bun runtime. See `vercel.json` for configuration.

## Author

Ali Shariatmadari
