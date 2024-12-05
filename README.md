# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/be05387d-0640-45b5-ace0-ed0e11f7fa33

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/be05387d-0640-45b5-ace0-ed0e11f7fa33) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with .

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/be05387d-0640-45b5-ace0-ed0e11f7fa33) and click on Share -> Publish.

## Déploiement sur Render

### Configuration automatique
1. Connectez votre compte GitHub à Render
2. Créez un nouveau Web Service
3. Sélectionnez ce repository
4. Render détectera automatiquement la configuration depuis `render.yaml`

### Variables d'environnement sur Render
Ajoutez ces variables d'environnement dans votre dashboard Render :
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_SERVICE_KEY`
- `PORT` (ajouté automatiquement par Render)

### Spécifications techniques
- Build Command: `NODE_OPTIONS=--max-old-space-size=4096 bun install && bun run build`
- Start Command: `bun run preview`
- Node Version: 18
- Bun Version: 1.1.0

## I want to use a custom domain - is that possible?

We don't support custom domains (yet). If you want to deploy your project under your own domain then we recommend using Netlify. Visit our docs for more details: [Custom domains](https://docs.lovable.dev/tips-tricks/custom-domain/)
