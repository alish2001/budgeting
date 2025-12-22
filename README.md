# Budget Planner

A modern budgeting web application that helps you track expenses using the **50/30/20 rule** (50% Needs, 30% Wants, 20% Savings).

## Features

- **Three-category budgeting** - Organize expenses into Needs, Wants, and Savings
- **Interactive pie charts** - Visualize budget breakdown with drill-down analysis
- **Real-time calculations** - Automatic totals and percentage tracking
- **Target comparison** - Visual progress bars comparing actual vs. target percentages
- **Persistent storage** - Auto-save to browser localStorage
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
