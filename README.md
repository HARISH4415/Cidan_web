# CIDAN Regulatory Compliance AI (`cidan-web`)

Embeddable CIDAN Regulatory Compliance and Document Analysis web application for React.

## Installation

```bash
npm install cidan-web
```

Ensure peer dependencies (`react`, `react-dom`, and `react-router-dom`) are installed in your project:

```bash
npm install react react-dom react-router-dom
```

---

## Quick Start (Option A: Embeddable App)

Import the CSS and embed the full `<CidanApp />` anywhere in your React application:

```tsx
import React from 'react'
import { CidanApp } from 'cidan-web'
import 'cidan-web/dist/style.css'

export default function MyDashboard() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <CidanApp />
    </div>
  )
}
```

### Embedding with a Sub-path / Basename

If your application mounts CIDAN under a route like `/compliance` or `/cidan`:

```tsx
<CidanApp basename="/compliance" />
```

### Embedding Inside an Existing React Router

`CidanApp` automatically detects if it is already rendered within a `<BrowserRouter>` / `<Router>` and avoids creating duplicate routers. You can also directly import and mount `<CidanRoutes />`:

```tsx
import { Routes, Route } from 'react-router-dom'
import { CidanRoutes } from 'cidan-web'
import 'cidan-web/dist/style.css'

function App() {
  return (
    <Routes>
      <Route path="/compliance/*" element={<CidanRoutes />} />
    </Routes>
  )
}
```

---

## Props

### `CidanAppProps`

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `basename` | `string` | `undefined` | Optional URL basename when routing under a subpath |
| `className` | `string` | `undefined` | Optional custom CSS class for outer container |
| `style` | `CSSProperties` | `undefined` | Optional inline styles for outer container |

---

## Local Development & Building

* **Run local development server:**
  ```bash
  npm run dev
  ```
* **Build library & generate TypeScript declarations:**
  ```bash
  npm run build
  ```
* **Dry run package contents before publishing:**
  ```bash
  npx npm pack --dry-run
  ```
* **Publish to npm:**
  ```bash
  npm login
  npm publish
  ```
