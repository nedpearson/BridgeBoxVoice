# Todo App — React + TypeScript + Supabase

A production-ready todo list application with user authentication, real-time optimistic UI updates, and Row Level Security.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth)

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- A [Supabase](https://supabase.com/) account (free tier works)

---

## Setup Instructions

### 1. Clone / Initialize the Project

```bash
cd your-project-folder
npm install
```

### 2. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com/) and sign in
2. Click **"New Project"** and fill in the details
3. Wait for your project to be provisioned (~1 minute)

### 3. Run the Database Schema

1. In the Supabase dashboard, navigate to **SQL Editor**
2. Click **New query**
3. Copy the entire contents of `DATABASE.sql` and paste it into the editor
4. Click **Run** — you should see "Success. No rows returned"

### 4. Configure Environment Variables

Copy the example env file:

```bash
cp .env.example .env
```

Fill in your credentials from the Supabase dashboard:

1. Go to **Project Settings → API**
2. Copy the **Project URL** → `VITE_SUPABASE_URL`
3. Copy the **anon / public** key → `VITE_SUPABASE_ANON_KEY`

Your `.env` should look like:

```env
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 5. (Optional) Configure Auth Email Confirmation

By default Supabase requires email confirmation. For local dev you can disable it:

1. Go to **Authentication → Providers → Email**
2. Toggle off **"Confirm email"**

Or simply check your inbox after signing up.

### 6. Run the App

```bash
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173)

---

## Features

- ✅ Email/password authentication (signup & signin)
- ✅ Session persistence across page refreshes
- ✅ Add, toggle, and delete todos
- ✅ Optimistic UI updates (instant feedback)
- ✅ Row Level Security — users only see their own data
- ✅ Loading states to prevent double-submission
- ✅ Error messages for auth and CRUD failures
- ✅ Empty state when no todos exist
- ✅ Responsive, modern UI with Tailwind CSS

---

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── Auth.tsx          # Sign in / Sign up form
│   │   ├── TodoList.tsx      # Main todo list view
│   │   └── TodoItem.tsx      # Individual todo row
│   ├── lib/
│   │   └── supabase.ts       # Supabase client
│   ├── types/
│   │   └── index.ts          # TypeScript interfaces
│   ├── App.tsx               # Root component (session management)
│   ├── main.tsx              # React entry point
│   └── index.css             # Global styles + Tailwind
├── DATABASE.sql              # Supabase schema (run this first!)
├── .env.example              # Environment variable template
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
└── tsconfig.json
```

---

## Build for Production

```bash
npm run build
```

Output goes to the `dist/` folder. Deploy to Vercel, Netlify, or any static host.

---

## Security Notes

- The **anon key** is safe to expose in the browser — Supabase RLS policies enforce data isolation
- Never expose your **service_role** key in a frontend app
- All queries are scoped to `auth.uid()` via RLS policies
