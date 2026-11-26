# CIDAN - Regulatory Compliance & Document Analysis AI

[![npm version](https://img.shields.io/npm/v/@harish_cidan/cidan-web.svg)](https://www.npmjs.com/package/@harish_cidan/cidan-web)
[![npm license](https://img.shields.io/npm/l/@harish_cidan/cidan-web.svg)](https://www.npmjs.com/package/@harish_cidan/cidan-web)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

**CIDAN** is an enterprise-grade AI platform for regulatory compliance, circular auditing, and financial document analysis. It empowers banks, financial institutions, and compliance officers to effortlessly analyze regulatory circulars, detect policy gaps, interact with an AI compliance chatbot, and generate audit-ready compliance reports.

This package (`@harish_cidan/cidan-web`) allows you to embed the complete CIDAN portal or its individual components directly into any React application with zero friction.

---

## 🚀 Key Features

* 🔐 **Secure Officer Authentication:** Official email verification and two-factor OTP authentication flow.
* 📄 **Multi-Format Document Upload:** Supports PDF, DOCX, and DOC documents up to 50 MB with instant validation.
* 🧠 **Automated Circular Analysis:** AI-powered evaluation of banking circulars with compliance scoring, risk tagging, and clause breakdown.
* 💬 **Interactive AI Compliance Assistant:** Built-in floating AI chatbot to answer complex regulatory questions and provide guidance.
* 📊 **Audit-Ready PDF Reports:** One-click generation and export of structured compliance audit reports with full cryptographic verification IDs.
* 🔄 **Flexible Routing:** Works out-of-the-box as a standalone application, under subpaths (`basename`), or seamlessly inside existing React Router setups.
* 🎨 **Complete Modern UI:** Pre-styled with polished glassmorphic styling, responsive layout, and responsive mobile support.

---

## 📦 Installation

Install the package via npm:

```bash
npm install @harish_cidan/cidan-web
```

### Peer Dependencies

Ensure your project has `react`, `react-dom`, and `react-router-dom` installed:

```bash
npm install react react-dom react-router-dom
```

---

## 💡 Quick Start

To embed the entire CIDAN application into your React project, import `<CidanApp />` and its stylesheet:

```tsx
import React from 'react'
import { CidanApp } from '@harish_cidan/cidan-web'
import '@harish_cidan/cidan-web/dist/style.css'

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <CidanApp />
    </div>
  )
}
```

---

## 🧭 Advanced Routing

### 1. Mounting Under a Sub-path (Basename)

If your app mounts CIDAN under a subpath like `/compliance` or `/cidan`:

```tsx
<CidanApp basename="/compliance" />
```

### 2. Embedding Inside an Existing React Router

`<CidanApp />` automatically detects if it is already wrapped in a `<BrowserRouter>`. If your app already has router routes, you can mount `<CidanRoutes />` directly:

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { CidanRoutes } from '@harish_cidan/cidan-web'
import '@harish_cidan/cidan-web/dist/style.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeDashboard />} />
        {/* CIDAN Portal Routes */}
        <Route path="/compliance/*" element={<CidanRoutes />} />
      </Routes>
    </BrowserRouter>
  )
}
```

---

## 🧩 Standalone Components & Utilities

You can also import individual components, utilities, and services for custom integrations:

```tsx
import { 
  AIChatbot, 
  DocumentUpload, 
  PDFReportPreview, 
  Header, 
  Hero, 
  LoginForm, 
  OTPInput 
} from '@harish_cidan/cidan-web'
import '@harish_cidan/cidan-web/dist/style.css'

export function MyCustomPage() {
  return (
    <div>
      <Header />
      <DocumentUpload onUploadComplete={(file) => console.log('File uploaded:', file)} />
      <AIChatbot />
    </div>
  )
}
```

---

## ⚙️ Props & Configuration

### `<CidanApp />`

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `basename` | `string` | `undefined` | The base URL pathname to serve CIDAN from (e.g. `"/compliance"`). |
| `className` | `string` | `undefined` | Additional CSS class for the root wrapper container. |
| `style` | `CSSProperties` | `undefined` | Custom inline styling applied to the root container. |

---

## 🔑 Demo & Testing

For testing and demonstration:
* **Default OTP:** `123456`
* Any valid email format (e.g., `officer@bank.com`) can be used to initiate the demo verification flow.

---

## 🛠️ Development & Contributing

To build and test the package locally:

```bash
# Clone the repository
git clone https://github.com/your-username/cidan-web.git
cd cidan-web

# Install dependencies
npm install

# Start development server
npm run dev

# Build library & generate TypeScript definitions
npm run build
```

---

## 📄 License

MIT © Harish & CIDAN Team
