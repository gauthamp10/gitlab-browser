# GitLab Browser

A modern, feature-rich GitLab frontend that authenticates using a **Personal Access Token** — no user license required. Built with React, TypeScript, and Tailwind CSS.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## ✨ Features

### Core GitLab Features
- 🔐 **Token authentication** — PAT-based login, no OAuth required
- 🏠 **Dashboard** — activity feed, contribution heatmap, starred/recent projects, todos widget
- 📁 **Projects** — search, filter, sort with visibility, star/unstar
- 🗂️ **Repository browser** — file tree, branch/tag switcher, syntax-highlighted file viewer (Shiki), blame view
- 🐛 **Issues** — list with filters/labels/milestones, detail view with comments and close/reopen
- 🔀 **Merge Requests** — list, detail with unified/split diff viewer, approve/merge/close, inline comments
- ⚙️ **Pipelines** — list with retry/cancel, detail with stage graph, job logs with ANSI color support
- 📖 **Wiki** — browse and read wiki pages
- 👥 **Groups** — list, group detail with subgroups and projects
- 👤 **Profile** — user profile with contribution heatmap and activity
- ✅ **Todos** — list and mark as done
- 🔍 **Global search** — projects, issues, MRs, commits, code

### Inspired by GitHub & Bitbucket
- 🌡️ **Contribution heatmap** (GitHub-style calendar)
- 🌐 **Multi-instance switcher** — connect to multiple GitLab instances
- 🌙 **Dark / Light / System theme**
- 📌 **Pinned projects** in sidebar
- 🔄 **Branch comparison** view (diff between branches)
- 📊 **Repository insights** — commit activity chart, language breakdown, top contributors
- ⌨️ **Keyboard shortcuts** (`g p` projects, `g d` dashboard, `g g` groups, `g t` todos, `/` search)
- 📋 **Copy clone URL** (HTTPS + SSH)

## 🚀 Quick Start — Docker (Recommended)

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) 24+
- [Docker Compose](https://docs.docker.com/compose/install/) v2+

### Run with Docker Compose

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/glab-browser.git
cd glab-browser

# Build and start (runs on http://localhost:3000)
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build the Docker image manually

```bash
docker build -t glab-browser .
docker run -p 3000:80 --name glab-browser glab-browser
```

## 💻 Local Development

### Prerequisites
- [Node.js](https://nodejs.org/) 20+
- npm 10+

### Setup

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev
```

### Build for production

```bash
npm run build       # TypeScript check + Vite build
npm run preview     # Preview production build locally
```

## 🔑 Required Token Scopes

Create a [Personal Access Token](https://gitlab.com/-/user_settings/personal_access_tokens) with these scopes:

| Scope | Required | Purpose |
|-------|----------|---------|
| `read_api` | ✅ Required | Read all GitLab resources |
| `read_repository` | ✅ Required | Browse repository files |
| `write_repository` | Optional | Create issues, MRs, comments |
| `api` | Optional | Full write access |

**Quick link**: `https://YOUR_GITLAB/-/user_settings/personal_access_tokens?name=glab-browser&scopes=read_api,read_repository`

## 🔐 Security

- Your token is stored **only in `localStorage`** on your browser
- It is **never sent** to any server other than your GitLab instance
- All API calls go directly from your browser to GitLab's API
- You can revoke your token at any time from GitLab's token settings

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `/` | Focus global search |
| `g` then `d` | Go to Dashboard |
| `g` then `p` | Go to Projects |
| `g` then `g` | Go to Groups |
| `g` then `t` | Go to Todos |

## 🏗️ Tech Stack

| Technology | Purpose |
|-----------|---------|
| React 18 + TypeScript | UI framework |
| Vite 5 | Build tool |
| React Router v6 | Client-side routing |
| TanStack Query v5 | Data fetching & caching |
| Zustand v4 | State management |
| Tailwind CSS v3 | Styling |
| Radix UI | Accessible UI primitives |
| Shiki | Syntax highlighting |
| Recharts | Charts & insights |
| date-fns | Date formatting |
| Lucide React | Icons |
| nginx | Production server |

## 📁 Project Structure

```
src/
├── api/          # GitLab REST API client modules
├── components/
│   ├── code/     # File viewer, diff viewer
│   ├── common/   # Shared UI (avatar, heatmap, pagination…)
│   ├── issues/   # Issue-specific components
│   ├── layout/   # App shell, sidebar, topbar
│   ├── pipelines/# Pipeline status, job log
│   └── ui/       # Base UI components (shadcn-style)
├── hooks/        # Custom React hooks
├── pages/
│   └── project/  # Project sub-pages
├── store/        # Zustand stores (auth, settings)
├── types/        # TypeScript type definitions
└── utils/        # Helper utilities
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

Please follow the existing code style and add tests for new features.

## 📄 License

[MIT](LICENSE) © 2024

---

> **Note**: This project is not affiliated with or endorsed by GitLab Inc. It uses the official [GitLab REST API](https://docs.gitlab.com/api/rest/).
