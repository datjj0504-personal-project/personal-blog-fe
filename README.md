# Personal Blog — Frontend

Frontend for my personal blog project, built with React + Vite. The interface allows users to register, log in, browse a news feed, create/edit/delete posts, like, and comment.

---

## Tech Stack

| Technology | Description |
|---|---|
| [React 19](https://react.dev/) | UI library |
| [Vite 7](https://vite.dev/) | Build tool & dev server |
| Plain CSS | Styling (no UI framework) |
| Session Storage | Client-side auth token storage |

---

## Features

- **Authentication** — Register, log in, and log out with JWT (stored in `sessionStorage`)
- **News Feed** — Browse all posts from the community
- **My Posts (Profile)** — View, edit, and delete your own posts
- **Create Post** — Modal editor with a 500-character limit
- **Like Posts** — Toggle like / unlike
- **Comments** — View and submit comments on any post
- **Protected Routes** — Automatically redirects to the home page if not authenticated
- **Backend Polling** — Waits for the backend to become available on startup (3-minute timeout)

---

## Project Structure

```
src/
├── assets/             # Static assets
├── components/
│   ├── Button.jsx
│   └── ProtectedRoute.jsx
├── context/
│   └── AuthContext.jsx # Global auth state
├── pages/
│   ├── HomePage.jsx    # Sign in / Sign up page
│   ├── HomePage.css
│   ├── BlogHome.jsx    # Main page after login
│   ├── BlogHome.css
│   ├── WelcomePage.jsx
│   └── WelcomePage.css
├── utils/
│   ├── authenticatedFetch.js  # Fetch wrapper that auto-attaches Bearer token
│   └── pollBackend.js         # Polling helper to wait for backend readiness
├── App.jsx             # Root component + routing
├── main.jsx
└── index.css
```

---

## Getting Started

### Prerequisites

- Node.js `>= 20.19.0`
- Backend running at `http://localhost:8081` (see [Backend](#backend))

### Install dependencies

```bash
npm install
```

### Start development server

```bash
npm run dev
```

Frontend runs at: **http://localhost:8082**

> The dev server automatically proxies all `/datnt/blog/server/*` requests to `http://localhost:8081` to avoid CORS issues.

### Build for production

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

---

## Proxy Configuration

In `vite.config.js`, all requests prefixed with `/datnt/blog/server` are forwarded to the backend:

```js
proxy: {
  '/datnt/blog/server': {
    target: 'http://localhost:8081',
    changeOrigin: true,
  },
}
```

---

## Authentication

- On successful login, the JWT is stored in `sessionStorage` under the key `authToken`
- The token automatically expires based on the `expiresIn` value returned by the backend
- `authenticatedFetch` automatically attaches the `Authorization: Bearer <token>` header to every protected request

---

## Backend

This is a **frontend-only** repository. The corresponding backend must be running on port `8081` and expose the following endpoints:

| Endpoint | Description |
|---|---|
| `POST /auth/register` | Register a new account |
| `POST /auth/login` | Log in |
| `POST /auth/logout` | Log out |
| `GET /feeds/resources` | Fetch the news feed |
| `GET /feeds/resources?personal=true` | Fetch the current user's posts |
| `POST /posts/create` | Create a new post |
| `POST /posts/update` | Update an existing post |
| `DELETE /posts/delete` | Delete a post |
| `POST /posts/like` | Toggle like on a post |
| `POST /comment` | Submit a comment |
| `GET /system/health` | Health check |

Backend repository: [datjj0504-personal-project](https://github.com/orgs/datjj0504-personal-project/repositories)

---

## Author

**Nguyen Tien Dat**  
GitHub: [datjj0504-personal-project](https://github.com/orgs/datjj0504-personal-project/repositories)