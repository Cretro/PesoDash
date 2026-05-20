# PesoDash

A personal finance dashboard web application built with React, Vite, and Firebase.

## Getting Started

Follow these steps to run the application locally:

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed (v18 or higher recommended).

### 2. Clone the Repository
```bash
git clone <repository-url>
cd PesoDash
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Set Up Environment Variables
Because database keys are not tracked in version control, you need to create an environment file:
1. Duplicate `.env.example` in the root directory and rename it to `.env`.
   - On macOS/Linux: `cp .env.example .env`
   - On Windows (PowerShell): `cp .env.example .env`
2. Open the newly created `.env` file and replace the placeholder values with your actual Firebase project configuration.

### 5. Run the App
Start the local development server:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser to view the application.
