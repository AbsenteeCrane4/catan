# Catan

A real-time multiplayer implementation of the classic **Settlers of Catan** built using:

* **Next.js** – Frontend and server framework
* **Socket.IO** – Real-time multiplayer communication
* **Node.js** – Backend runtime
* **Vitest** – Unit testing
* **Docker** – Containerisation
* **GitHub Actions** – Automated CI/CD pipeline [![Catan Unit Tests and Build Pipeline](https://github.com/AbsenteeCrane4/catan/actions/workflows/ci.yml/badge.svg)](https://github.com/AbsenteeCrane4/catan/actions/workflows/ci.yml)

---

# 📦 Installation

## 1. Clone the repository from GitHub

```bash
git clone https://github.com/AbsenteeCrane4/catan.git
cd catan
```

## 2. Install dependencies

```bash
npm install
```

---

# 🧪 Running Unit Tests

This project uses **Vitest** for unit testing.

## Run tests once

```bash
npm run test
```

## Run tests in GUI mode

```bash
npm run test -- --ui
```

## Run tests with coverage

```bash
npm run test -- --coverage
```

---

# ▶️ Running the Game Locally

## Start the development server

```bash
npm run dev
```

This will start the Next.js server and Socket.IO server.

By default the game will be available at:

```bash
http://localhost:3000
```

Hot reload is enabled, so changes will update automatically.

---

# 🏗️ Creating a Production Build

To create an optimised production build:

```bash
npm run build
```

This will generate the production build in:

```bash
.next/
dist-server
```

## Run the production build locally

```bash
npm run start
```

---

# 🐳 Docker Setup

## Build the Docker image

From the root of the project:

```bash
docker build -t catan .
```

## Run the Docker container

```bash
docker run -p 3000:3000 catan
```

The game will be available at:

```bash
http://localhost:3000
```

## Run in detached mode

```bash
docker run -d -p 3000:3000 --name catan-container catan
```

## Stop the container

```bash
docker stop catan-container
```

## Remove the container

```bash
docker rm catan-container
```

---

# 🔄 Automated CI/CD Pipeline

This project uses **GitHub Actions** for continuous integration and deployment.

## Pipeline Overview

The pipeline runs automatically when:
* A pull request is opened
* A pull request is updated

---

## Pipeline Stages

### 1. Install Dependencies

The pipeline installs project dependencies:

```bash
npm ci
```

This ensures a clean, reproducible install.

---

### 2. Run Unit Tests

All Vitest tests are executed:

```bash
npm run test
```

If any test fails, the pipeline stops.

---

### 3. Build Application

The Next.js production build is created:

```bash
npm run build
```

This verifies the app builds successfully.

---

# 📁 Project Structure

```bash
.
├── .github/workflows   # All CI/CD yml files 
├── /src/app            # The main Catan Pages
├── /src/components/    # React components
├── /src/hooks          # Client/Server Multiplayer interface
├── /src/lib            # Libs containing game engine and logic
├── /src/types          # All custom types used within the game
├── server.ts           # Socket.IO server logic
├── public/             # Static assets
├── Dockerfile          # Docker configuration
├── package.json        # Dependencies and scripts
└── README.md
```

---

# 📜 Available Scripts

```bash
npm run dev        # Run development server
npm run build      # Build production version
npm run start      # Run production server
npm run test       # Run tests
npm run lint       # Run linter
```

---

# 🧩 Technologies Used

* Next.js
* React
* Socket.IO
* Node.js
* Vitest
* Docker
* GitHub Actions

---
