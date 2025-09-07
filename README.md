# Vite Typescript/React Supabase

## Install Supabase

You need Docker to install supabase locally.

```bash
npm install supabase --save-dev
npx supabase init
npx supabase start
```

## Create table

Run sample-db.sql query in supabase studio > SQL editor.

Don't forget to enable Realtime in Table Editor > Tasks > Realtime on.

## Install project

```
bun install
```

## Set env vars in .env

You'll need the anon key and supabase API url.

```
bun run dev
```

## List of installed packages

- react-router-dom
- react-icons
- react-hook-form
- @tanstack/react-query
- react-toastify
- tailwind
