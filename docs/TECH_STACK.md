# Tech Stack Documentation

## 📋 Overview

This document outlines the current technology stack for the Ignite Fulfillment Hub application, along with recommendations for improvements where applicable.

---

## 🎨 Frontend

| Category | Technology | Version | Link | Notes |
|----------|-----------|---------|------|-------|
| **Framework** | React | ^18.3.1 | [React](https://react.dev/) | ✅ Modern, stable |
| **Router** | React Router | ^6.30.1 | [React Router](https://reactrouter.com/) | ⚠️ Consider upgrading to TanStack Router |
| **Data Fetching** | TanStack Query | ^5.83.0 | [TanStack Query](https://tanstack.com/query) | ✅ Excellent choice |
| **State Management** | React Context + TanStack Query | - | - | ✅ Good for current scale |
| **UI Components** | Radix UI | ^1.x - ^2.x | [Radix UI](https://www.radix-ui.com/) | ✅ Headless, accessible |
| **Component Framework** | shadcn/ui | - | [shadcn/ui](https://ui.shadcn.com/) | ✅ Modern, customizable |
| **Styling** | Tailwind CSS | ^3.4.17 | [Tailwind CSS](https://tailwindcss.com/) | ⚠️ Consider upgrading to v4 |
| **CSS Utilities** | clsx + tailwind-merge | ^2.x | - | ✅ Good pattern |
| **Forms** | React Hook Form | ^7.61.1 | [React Hook Form](https://react-hook-form.com/) | ✅ Performant |
| **Validation** | Zod | ^3.25.76 | [Zod](https://zod.dev/) | ✅ Type-safe validation |
| **Charts** | Recharts | ^2.15.4 | [Recharts](https://recharts.org/) | ✅ React-friendly |
| **Animation** | Framer Motion | ^12.26.2 | [Framer Motion](https://www.framer.com/motion/) | ✅ Production-ready |
| **Icons** | Lucide React | ^0.462.0 | [Lucide](https://lucide.dev/) | ✅ Modern, tree-shakeable |
| **Date Utilities** | date-fns | ^3.6.0 | [date-fns](https://date-fns.org/) | ✅ Lightweight |
| **i18n** | Custom Context-based | - | - | ⚠️ Consider react-i18next |
| **Build Tool** | Vite | - | [Vite](https://vitejs.dev/) | ✅ Fast, modern |
| **Compiler** | SWC (via @vitejs/plugin-react-swc) | ^3.11.0 | [SWC](https://swc.rs/) | ✅ Fast compilation |
| **TypeScript** | TypeScript | ^5.8.3 | [TypeScript](https://www.typescriptlang.org/) | ✅ Latest stable |
| **Package Manager** | Bun | - | [Bun](https://bun.sh/) | ✅ Fast, modern |
| **Linting** | ESLint | ^9.32.0 | [ESLint](https://eslint.org/) | ✅ Industry standard |
| **Linting (TypeScript)** | typescript-eslint | - | [typescript-eslint](https://typescript-eslint.io/) | ✅ Well integrated |
| **Unit Testing** | Vitest | ^4.0.16 | [Vitest](https://vitest.dev/) | ✅ Fast, Vite-native |
| **Testing Library** | React Testing Library | ^16.3.1 | [Testing Library](https://testing-library.com/react) | ✅ Best practices |
| **E2E Testing** | Playwright | ^1.57.0 | [Playwright](https://playwright.dev/) | ✅ Cross-browser |
| **Error Tracking** | Sentry | ^10.32.1 | [Sentry](https://sentry.io/) | ✅ Production monitoring |
| **Virtual Lists** | TanStack Virtual | ^3.13.13 | [TanStack Virtual](https://tanstack.com/virtual) | ✅ Performance optimization |

---

## 🔧 Backend / BaaS

| Category | Technology | Version | Link | Notes |
|----------|-----------|---------|------|-------|
| **Backend Platform** | Supabase | - | [Supabase](https://supabase.com/) | ✅ PostgreSQL-based BaaS |
| **Database** | PostgreSQL | - | [PostgreSQL](https://www.postgresql.org/) | ✅ Via Supabase |
| **Authentication** | Supabase Auth | ^2.89.0 | - | ✅ Built-in JWT auth |
| **Real-time** | Supabase Realtime | ^2.89.0 | - | ✅ WebSocket-based |
| **Storage** | Supabase Storage | ^2.89.0 | - | ✅ S3-compatible |
| **Edge Functions** | Deno | std@0.168.0 | [Deno](https://deno.land/) | ✅ Serverless functions |
| **Type Generation** | Supabase CLI | ^2.72.8 | - | ✅ Auto-generated types |
| **Validation** | Zod | - | [Zod](https://zod.dev/) | ✅ Shared with frontend |
| **API Client** | @supabase/supabase-js | ^2.89.0 | - | ✅ Official SDK |

---

## 🚀 DevOps & Tooling

| Category | Technology | Version | Link | Notes |
|----------|-----------|---------|------|-------|
| **Package Manager** | Bun | - | [Bun](https://bun.sh/) | ✅ Fast installs & scripts |
| **Version Control** | Git | - | - | ✅ Standard |
| **Linting** | ESLint | ^9.32.0 | [ESLint](https://eslint.org/) | ✅ Configured |
| **Formatting** | None | - | - | ❌ **Missing** |
| **Pre-commit** | None | - | - | ❌ **Missing** |
| **CI/CD** | Not detected | - | - | ⚠️ Status unclear |
| **Deployment** | Lovable (inferred) | - | - | ✅ Platform-managed |

---

## 📊 Recommended Improvements

### 🔴 High Priority

#### 1. **Add Code Formatter (Biome)**
**Current:** No formatter configured  
**Recommended:** [Biome](https://biomejs.dev/)

**Why:** 
- Unified linting + formatting (replaces ESLint + Prettier)
- 100x faster than Prettier
- Zero config needed
- Better with monorepos

**Installation:**
```bash
bun add -D @biomejs/biome
```

**Configuration** (`biome.json`):
```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": { "recommended": true }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2
  }
}
```

**Alternative:** Keep ESLint and add Prettier if Biome migration is too disruptive.

---

#### 2. **Add Pre-commit Hooks (Lefthook)**
**Current:** No pre-commit validation  
**Recommended:** [Lefthook](https://github.com/evilmartians/lefthook)

**Why:**
- Prevent broken code from being committed
- Fast (parallel execution, native Go binary)
- Simple YAML configuration

**Installation:**
```bash
bun add -D lefthook
```

**Configuration** (`.lefthook.yml`):
```yaml
pre-commit:
  parallel: true
  commands:
    lint:
      glob: "*.{ts,tsx}"
      run: bun run lint --fix {staged_files}
    format:
      glob: "*.{ts,tsx,json,md}"
      run: biome format --write {staged_files}
    types:
      glob: "*.{ts,tsx}"
      run: tsc --noEmit
```

---

#### 3. **Upgrade Tailwind CSS to v4**
**Current:** v3.4.17  
**Recommended:** [Tailwind CSS v4](https://tailwindcss.com/)

**Why:**
- 10x faster builds
- CSS-first configuration
- Better DX with native CSS variables
- Smaller bundle size

**Migration:** Follow official upgrade guide (breaking changes expected).

---

#### 4. **Replace React Router with TanStack Router**
**Current:** React Router v6.30.1  
**Recommended:** [TanStack Router](https://tanstack.com/router)

**Why:**
- Type-safe routing (full TypeScript inference)
- Built-in search params validation (Zod integration)
- Better code splitting
- Integrated with TanStack Query (you're already using)
- Modern API design

**Trade-offs:**
- Learning curve (new API)
- Migration effort (moderate)
- Smaller ecosystem (newer library)

**Priority:** Medium-High. Do this if you're already refactoring routing or starting new features.

---

### 🟡 Medium Priority

#### 5. **Migrate to React i18next**
**Current:** Custom Context-based i18n  
**Recommended:** [react-i18next](https://react.i18next.com/)

**Why:**
- Industry standard
- Better tooling (translation management, IDE plugins)
- Lazy loading translations
- Namespace support for large apps
- ICU message format

**Your Current Setup:**
- ✅ Centralized in one file (`LanguageContext.tsx`)
- ✅ Works well
- ❌ No lazy loading
- ❌ No pluralization rules
- ❌ Manual maintenance

**Migration Effort:** Medium (but your current centralized approach makes it easier).

---

#### 6. **Add API Documentation (Swagger/OpenAPI)**
**Current:** None detected  
**Recommended:** OpenAPI spec for Edge Functions

**Why:**
- Document Supabase Edge Functions
- Generate TypeScript clients (with orval or openapi-typescript)
- Better team collaboration

**Tools:**
- [Scalar](https://scalar.com/) - Modern API docs
- [orval](https://orval.dev/) - Generate React Query hooks from OpenAPI

---

#### 7. **Add Storybook for Component Development**
**Current:** No component documentation  
**Recommended:** [Storybook](https://storybook.js.org/)

**Why:**
- Isolated component development
- Visual regression testing
- Documentation for shadcn/ui customizations

---

### 🟢 Nice to Have

#### 8. **API Query Generation with Orval**
**Current:** Manual TanStack Query hooks  
**Recommended:** [orval](https://orval.dev/)

**Why:**
- Auto-generate React Query hooks from Supabase OpenAPI
- Type-safe by default
- Less boilerplate

**Trade-off:** Supabase already generates TypeScript types, so benefit is smaller.

---

#### 9. **Consider Micro Frontend Architecture**
**Current:** Monolith  
**Recommended:** Module Federation (if needed)

**When to use:**
- Multiple teams working on different features
- Need to deploy features independently
- Large application (>100k LOC)

**Your situation:** Probably NOT needed yet based on project size.

---

#### 10. **Add Bruno for API Testing**
**Current:** None detected  
**Recommended:** [Bruno](https://www.usebruno.com/)

**Why:**
- Open-source Postman alternative
- Git-friendly (file-based)
- Test Supabase Edge Functions locally

---

## 🏆 Current Strengths

Your tech stack has several excellent choices:

1. ✅ **Modern React** with TypeScript
2. ✅ **TanStack Query** - Industry best practice for data fetching
3. ✅ **Bun** - Cutting-edge, fast tooling
4. ✅ **Vite + SWC** - Lightning-fast builds
5. ✅ **shadcn/ui + Radix** - Modern, accessible UI
6. ✅ **Vitest + Playwright** - Comprehensive testing
7. ✅ **Supabase** - Powerful BaaS with PostgreSQL
8. ✅ **Sentry** - Production error tracking
9. ✅ **Zod** - Type-safe validation
10. ✅ **Deno Edge Functions** - Serverless with TypeScript

---

## 📈 Comparison to Example Stack

| Category | Example | Current | Status |
|----------|---------|---------|--------|
| **Frontend Framework** | React 19 | React 18 | ⚠️ Upgrade available |
| **Router** | TanStack Router | React Router | ⚠️ Recommend upgrade |
| **Data Fetching** | TanStack Query ✅ | TanStack Query ✅ | ✅ Match |
| **Styling** | Tailwind v4 | Tailwind v3 | ⚠️ Upgrade available |
| **Build Tool** | Vite ✅ | Vite ✅ | ✅ Match |
| **Package Manager** | Bun ✅ | Bun ✅ | ✅ Match |
| **Test Framework** | Bun | Vitest | ℹ️ Different approach |
| **Formatting** | Biome | None | ❌ Missing |
| **Linting** | Biome | ESLint | ⚠️ Different |
| **i18n** | react-i18next | Custom | ⚠️ Consider upgrade |
| **API Generation** | Orval | Manual | ⚠️ Optional improvement |
| **E2E** | Playwright ✅ | Playwright ✅ | ✅ Match |
| **Pre-commit** | Lefthook | None | ❌ Missing |
| **Backend Framework** | NestJS | Supabase + Deno | ℹ️ Different architecture |
| **ORM** | Drizzle | Supabase Client | ℹ️ BaaS vs. ORM |
| **Validation** | Zod ✅ | Zod ✅ | ✅ Match |
| **API Docs** | Swagger | None | ❌ Missing |

---

## 🎯 Action Plan (Recommended Order)

### Phase 1: Quick Wins (1-2 days)
1. ✅ Add Biome for formatting + linting
2. ✅ Add Lefthook for pre-commit hooks
3. ✅ Add Bruno collection for Edge Functions

### Phase 2: Modernization (1-2 weeks)
4. ⚠️ Upgrade Tailwind CSS to v4
5. ⚠️ Upgrade React to v19 (when stable)
6. ⚠️ Consider TanStack Router migration (if refactoring routing)

### Phase 3: Long-term Improvements (Ongoing)
7. 🟡 Migrate to react-i18next
8. 🟡 Add Storybook
9. 🟡 Add API documentation

---

## 📝 Notes

### Why Supabase Instead of NestJS?
Your current architecture uses **Supabase** (BaaS) instead of **NestJS** (custom backend):

**Advantages:**
- ✅ Faster development (built-in auth, database, storage)
- ✅ Less infrastructure management
- ✅ Automatic PostgreSQL scaling
- ✅ Built-in real-time subscriptions
- ✅ Row-level security (RLS)

**Trade-offs:**
- ⚠️ Less flexibility for complex business logic
- ⚠️ Vendor lock-in
- ⚠️ Edge Functions have cold start times (Deno)

**Verdict:** Good choice for MVP and growing applications. Consider NestJS + Drizzle if you need:
- Complex business logic
- Microservices architecture  
- Multi-tenancy with complex rules
- Full control over database migrations

---

## 🔗 Quick Links

- [React](https://react.dev/)
- [TanStack Query](https://tanstack.com/query)
- [TanStack Router](https://tanstack.com/router)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Biome](https://biomejs.dev/)
- [Lefthook](https://github.com/evilmartians/lefthook)
- [Supabase](https://supabase.com/)
- [Playwright](https://playwright.dev/)
- [Vitest](https://vitest.dev/)
- [Bun](https://bun.sh/)

---

**Last Updated:** February 2, 2026  
**Maintained by:** Development Team
