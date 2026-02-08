# Contributing to Docita

Thank you for your interest in contributing to Docita! This document provides guidelines and instructions for contributing to this project. We want to make it as easy as possible for you to get started.

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v20 or higher
- **pnpm**: v10+ (This project uses pnpm for package management)
- **Docker**: Required for running the database and other services locally if not using cloud providers.

### Installation

1.  **Clone the repository**:

    ```bash
    git clone https://github.com/CVamsi27/docita.git
    cd docita
    ```

2.  **Install dependencies**:

    ```bash
    pnpm install
    ```

3.  **Environment Setup**:
    - Copy `.env.example` to `.env` in the root and/or specific app directories (`apps/api`, `apps/app`).
    - Populate the necessary environment variables (Database URL, Auth secrets, etc.).

4.  **Database Setup**:
    This project uses a shared database package.

    ```bash
    pnpm db:generate # Generate Prisma Client
    pnpm db:push     # Push schema changes to DB
    ```

5.  **Run Development Servers**:
    ```bash
    pnpm dev
    ```
    This will start all applications (App, Admin, API, Landing) concurrently. You can filter specific apps using:
    ```bash
    pnpm dev --filter=@docita/app
    ```

## 🛠 Project Structure

This is a Monorepo managed by **Turborepo**.

### Apps (`/apps`)

- **`api`**: Backend API (NestJS)
- **`app`**: Main Patient/Clinic Web Application (Next.js)
- **`admin`**: Super Admin Dashboard (Next.js)
- **`landing`**: Marketing Landing Page (Next.js)

### Packages (`/packages`)

- **`db`**: Prisma schema and database client configuration
- **`ui`**: Shared UI component library (Shadcn UI, Tailwind)
- **`config`**: Shared configurations (ESLint, TypeScript, Tailwind)
- **`utils`**: Shared utility functions
- **`types`**: Shared TypeScript definitions

## 💻 Development Workflow

1.  **Create a Branch**:
    - Use descriptive names: `feature/new-sidebar`, `fix/login-bug`, `chore/update-deps`.
    - Format: `type/description`

2.  **Make Changes**:
    - Write clean, maintainable code.
    - Ensure you are working in the correct workspace.

3.  **Commit Changes**:
    - We follow **Conventional Commits**.
    - Format: `type(scope): subject`
    - Examples:
      - `feat(api): add new appointment endpoint`
      - `fix(app): resolve layout shift on mobile`
      - `style(ui): update primary button color`

4.  **Verify**:
    Before pushing, ensure your code passes standard checks:

    ```bash
    pnpm lint    # Check for linting errors
    pnpm build   # Verify build consistency
    pnpm test    # Run tests
    ```

5.  **Push and PR**:
    - Push your branch to the repository.
    - Open a Pull Request (PR) against `main`.
    - Provide a clear description of the changes and link relevant issues.

## 🎨 Coding Standards

### TypeScript

- Use explicit types whenever possible. avoid `any`.
- Define shared types in `packages/types` if used across multiple apps.

### Styling

- We use **Tailwind CSS**.
- Use shared components from `packages/ui` rather than re-creating them.
- Follow the design system defined in `packages/config/tailwind`.

### Linting & Formatting

- The project uses **ESLint** and **Prettier**.
- Run `pnpm format` to automatically format your code.

## 🗄 Database Changes

If your contribution involves database schema changes:

1.  Modify `packages/db/prisma/schema.prisma`.
2.  Run `pnpm db:generate` to update the client.
3.  Ensure your changes are backward compatible or provide migration steps.

## 🧪 Testing

- **Unit Tests**: Should be written for complex logic.
- **E2E Tests**: Major flows should be verified.
- Run tests via `pnpm test` or specific package scripts.

---

Thank you for contributing to building the modern clinic OS!
