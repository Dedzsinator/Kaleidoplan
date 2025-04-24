# Kaleidoplan Documentation and Usage Guide

## Table of Contents

1. [Introduction](#introduction)
2. [Features](#features)
3. [System Architecture](#system-architecture)
4. [Installation](#installation)
5. [Configuration](#configuration)
6. [User Guide](#user-guide)
7. [Backend Services](#backend-services)
8. [Development Guide](#development-guide)
9. [Deployment](#deployment)
10. [Troubleshooting](#troubleshooting)
11. [CI/CD Pipeline](#ci-cd-pipeline)
12. [Contributing](#contributing)
13. [License](#license)

## Introduction

Kaleidoplan is a comprehensive web-based event management application built with React and TypeScript. It enables organizations and individuals to create, manage, and organize events efficiently, featuring task assignment, event analytics, interactive maps, role-based access control, and Spotify playlist integration.

The platform serves different user roles:

- **Guests**: Can browse public events, view details, and see locations on a map.
- **Users**: Authenticated users can manage their profile and potentially track events.
- **Organizers**: Can create and manage events, assign tasks, and view event analytics.
- **Administrators**: Have full control over users, events, and system settings.

## Features

### Guest Features

- View a list of public events with filtering options.
- See detailed event information including description, date, time, and location.
- View event locations on an interactive map (using Leaflet).
- Image slideshow for event galleries.
- Responsive design for desktop and mobile browsers.
- Animated UI elements for a smooth user experience.

### User Features (Authenticated)

- Personalized dashboard (potential feature).
- User profile management.
- Login and registration functionality via Firebase Auth.

### Organizer Features

- Create, update, and delete events (via backend API interacting with MongoDB).
- Manage event details: name, description, dates, location (address and coordinates).
- Upload cover images and slideshow galleries for events (via Firebase Storage or backend API).
- View event analytics and participation data (e.g., `EventAnalyticsScreen`).
- Manage tasks associated with events (e.g., `OrganizerTaskScreen`).
- Role-specific dashboard (`OrganizerDashboardScreen`).
- Manage event playlists via Spotify integration.

### Admin Features

- Full user management: view, add, edit, delete users (`UserManagementScreen`).
- Assign roles (user, organizer, admin) to users.
- Full event management capabilities (`EventManagementScreen`).
- Access to an administrative panel (`AdminPanelScreen`).
- Oversee system-wide settings and data.

### Core System Features

- **Authentication**: Secure user login and registration using Firebase Authentication.
- **Role-Based Access Control (RBAC)**: Protected routes and features based on user roles (user, organizer, admin).
- **Database**: MongoDB (via a Node.js/Express backend) for primary event data, users, tasks, playlists. Note: Some frontend hooks (`useFirebase.ts`) suggest potential direct interaction with Firebase Firestore for specific features, creating a dual data source possibility.
- **API**: Backend API built with Node.js/Express (in `/server`) handling data operations for MongoDB.
- **Mapping**: Interactive maps using Leaflet and OpenStreetMap for displaying event locations. Geocoding via Nominatim for address lookup.
- **Frontend**: Built with React, TypeScript, and React Router for navigation.
- **Styling**: CSS Modules (`*.css`) for component-specific styles.
- **Validation**: Client-side validation using Yup.
- **State Management**: React Context API (e.g., `AuthContext`) and component state (`useState`, `useRef`, `useEffect`).
- **Storage**: Firebase Storage for image uploads (cover images, slideshows).
- **Music Integration**: Spotify API integration for playlist management and playback (`playlistService.tsx`, `spotifyService`). Web Audio API for playback control.

## System Architecture

Kaleidoplan employs a modern web application architecture with distinct frontend and backend components:

- **Frontend (`/src`)**:
  - Framework/Library: React v18 with TypeScript
  - Routing: React Router v6
  - Build Tool: Create React App (potentially customized with Craco) / Webpack
  - Styling: CSS Modules, standard CSS
  - Mapping: React Leaflet, Leaflet.js
  - State Management: React Context (`AuthContext`), Local Component State
  - Validation: Yup
  - Testing: Jest, React Testing Library
  - Firebase SDK: Direct interaction with Firebase Auth, Firebase Storage, and potentially Firestore (`useFirebase.ts`, `config/firebase.tsx`).
  - API Client: Axios (configured in `mongoService.tsx`) for communication with the Node.js backend.
  - Spotify Client: Wrapper around Spotify Web API (`spotify-web-api.js`).
- **Backend (`/server`)**:

  - Runtime: Node.js
  - Framework: Express.js
  - Database: MongoDB with Mongoose ODM (`server/models/`)
  - Authentication: Middleware likely verifies Firebase tokens (`server/middleware/auth.js`) using Firebase Admin SDK (`server/config/firebase.js`).
  - Routing: Defined in `server/routes/` using controllers (`server/controllers/`).
  - Configuration: Manages DB and Firebase Admin SDK connections (`server/config/`).

- **API**: RESTful API endpoints exposed by the Node.js backend, handling CRUD operations for MongoDB data.

## Installation

### Prerequisites

- Node.js (v16 or later recommended) and npm
- MongoDB instance (local or cloud-based like MongoDB Atlas)
- Firebase Project configured for Authentication and Storage. A Service Account Key (`serviceAccountKey.json`) is needed for the backend.
- Spotify Developer Application credentials (Client ID, Client Secret).

### Setup Steps

1. **Clone the repository:**

   ```bash
   git clone <your-repository-url>
   cd Kaleidoplan
   ```

2. **Install Frontend Dependencies:**

   ```bash
   npm install
   ```

3. **Install Backend Dependencies:**

   ```bash
   cd server
   npm install
   cd ..
   ```

4. **Configure Environment Variables:**
   Create `.env` files in both the project root (`/Kaleidoplan/.env`) and the server directory (`/Kaleidoplan/server/.env`). See [Configuration](#configuration).

5. **Place Firebase Service Account Key:**
   Put your downloaded `serviceAccountKey.json` file into the `/Kaleidoplan/server/config/` directory.

6. **Start the backend server:**

   ```bash
   cd server
   npm run dev # Or the appropriate script from server/package.json
   cd ..
   ```

7. **Start the frontend development server:**
   (Check your root `package.json` scripts - it might be `npm start` or `craco start`)

   ```bash
   npm start
   ```

## Configuration

### Frontend (`/Kaleidoplan/.env`)

Create a `.env` file in the root of the project:

```env
# Firebase Configuration (Obtain from your Firebase project settings - Web App)

REACT_APP_FIREBASE_API_KEY="YOUR_FIREBASE_WEB_API_KEY"
REACT_APP_FIREBASE_AUTH_DOMAIN="YOUR_FIREBASE_AUTH_DOMAIN"
REACT_APP_FIREBASE_PROJECT_ID="YOUR_FIREBASE_PROJECT_ID"
REACT_APP_FIREBASE_STORAGE_BUCKET="YOUR_FIREBASE_STORAGE_BUCKET"
REACT_APP_FIREBASE_MESSAGING_SENDER_ID="YOUR_FIREBASE_MESSAGING_SENDER_ID"
REACT_APP_FIREBASE_APP_ID="YOUR_FIREBASE_WEB_APP_ID"
REACT_APP_FIREBASE_MEASUREMENT_ID="YOUR_FIREBASE_MEASUREMENT_ID" # Optional

# Backend API Configuration

REACT_APP_API_URL="http://localhost:3000/api" # URL where your Node.js backend runs

# Spotify Configuration (If needed client-side)

REACT_APP_SPOTIFY_CLIENT_ID="YOUR_SPOTIFY_CLIENT_ID"
```

### Backend (`/Kaleidoplan/server/.env`)

Create a `.env` file in the `/server` directory:

```env
 # Server Configuration
 PORT=3000 # Port the backend server will run on

 # MongoDB Configuration
 MONGODB_URI="mongodb://localhost:27017/kaleidoplan" # Your MongoDB connection string
 MONGODB_DB_NAME="kaleidoplan" # Your database name

 # Firebase Admin Configuration (Can use GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT)
 # Option 1: Path to the key file
 GOOGLE_APPLICATION_CREDENTIALS="./config/serviceAccountKey.json"
 # Option 2: JSON content as a string (useful for some deployment environments)
 # FIREBASE_SERVICE_ACCOUNT='{"type": "service_account", "project_id": "...", ...}'

 # JWT Secret (If used for custom tokens or sessions)
 # JWT_SECRET="YOUR_SECRET_KEY"

 # Spotify Configuration (For backend interactions)
 REACT_APP_SPOTIFY_CLIENT_ID="YOUR_SPOTIFY_CLIENT_ID"
 REACT_APP_SPOTIFY_CLIENT_SECRET="YOUR_SPOTIFY_CLIENT_SECRET"
 SPOTIFY_REDIRECT_URI="http://localhost:3000/api/auth/spotify/callback" # Adjust port if needed
```

**Notes:**

- Ensure your Firebase project has Authentication (Email/Password) enabled.
- Ensure Firebase Storage is set up.
- The `REACT_APP_API_URL` in the frontend `.env` should point to where your Node.js backend is accessible (matching the `PORT` in the backend `.env` during local development). The `proxy` in the root `package.json` might also be used for development convenience.
- Obtain Spotify credentials from the Spotify Developer Dashboard. Configure the Redirect URI in Spotify to match `SPOTIFY_REDIRECT_URI`.

## User Guide

### Guest

- Visit the application URL (e.g., `http://localhost:8080` if using `npm start`).
- Browse events on the `/home` or `/events` pages.
- Click on an event card to view details, including description, gallery, and map location.

### Registered User

- Navigate to `/register` to create an account or `/login` to sign in using Firebase Authentication.
- Once logged in, access your dashboard at `/dashboard`.
- Manage profile settings.

### Organizer

- Log in with an account that has the 'organizer' role (assigned by an Admin).
- Access the organizer dashboard at `/organizer`.
- Navigate to `/events/manage` (or similar route) to create or edit events. Data is saved to MongoDB via the backend API.
- Use `/tasks` to manage tasks related to your events (interacts with the MongoDB backend).
- View analytics for your events via `/analytics/:eventId`.
- Manage event playlists via Spotify integration.

### Administrator

- Log in with an account that has the 'admin' role.
- Access the admin panel at `/admin`.
- Manage users (roles, details) via `/admin/user` (interacts with backend API/Firebase Auth).
- Manage all events via `/events/manage` or a dedicated admin event management route.

## Backend Services (`/server`)

### API Service Structure

The Node.js/Express backend provides RESTful APIs for core data operations, primarily interacting with MongoDB.

- **Authentication (`auth.controller.js`, `auth.js` middleware)**: Handles user login/registration callbacks (linking Firebase Auth with MongoDB user records), token verification (verifying Firebase ID tokens).
- **Users (`admin.controller.js`?)**: CRUD operations for user profiles stored in MongoDB, role management.
- **Events (`events.controller.js`)**: CRUD operations for events stored in MongoDB.
- **Tasks (`tasks.controller.js`?)**: CRUD operations for tasks associated with events in MongoDB.
- **Playlists (`playlists.controller.js`?)**: CRUD for playlists, potentially interacting with Spotify.
- **Public (`public.controller.js`)**: Endpoints for fetching public data (e.g., events for guests).
- **Spotify (`spotify.js` config, controllers)**: Handles Spotify OAuth flow and API interactions.

### Key API Endpoints (Examples based on structure)

- `POST /api/auth/firebase` (Verify Firebase token, create/update MongoDB user)
- `GET /user` (Admin)
- `PUT /user/:userId/role` (Admin)
- `GET /api/events` (Public/Authenticated)
- `POST /api/events` (Organizer/Admin - Creates event in MongoDB)
- `GET /api/events/:eventId`
- `PUT /api/events/:eventId`
- `DELETE /api/events/:eventId`
- `GET /api/events/:eventId/tasks`
- `POST /api/tasks`
- `GET /api/playlists`
- `GET /api/playlists/:playlistId`
- `GET /api/auth/spotify` (Initiate Spotify login)
- `GET /api/auth/spotify/callback` (Handle Spotify callback)

### Data Models (MongoDB - `server/models/`)

- **Event (`event.model.js`)**: Defines the structure for events in MongoDB, including name, dates, location details, image URLs (coverImageUrl, slideshowImages), performers (ref), playlistId, status ('upcoming', 'ongoing', 'completed'), createdBy, virtuals for tasks/sponsors.
- **User (`user.model.js`?)**: Likely stores user details linked to Firebase UID, including email, displayName, role (`user`, `organizer`, `admin`).
- **Task (`task.model.js`?)**: Stores task details, linked to an Event and potentially an assigned User.
- **Performer (`performer.model.js`?)**: Stores performer details, potentially linked to Spotify.
- **Playlist (`playlist.model.js`?)**: Stores playlist metadata, possibly linking tracks or a Spotify Playlist ID.

_(Note: The frontend hook `useFirebase.ts` defines `Event` and `EventInput` types that differ slightly from the backend model, particularly regarding `status` values and image handling. This suggests direct Firestore interaction might be used for some specific event-related features or was part of a previous implementation. The primary data source for events appears to be MongoDB via the backend API, as used in `eventService.tsx`.)_

## Development Guide

### Project Structure

/home/deginandor/Documents/Programming/Kaleidoplan/
├── public/ # Static assets and index.html for CRA frontend
├── server/ # Node.js/Express Backend
│ ├── config/ # DB, Firebase Admin, Spotify config
│ ├── controllers/ # Route handlers
│ ├── middleware/ # Express middleware (e.g., auth)
│ ├── models/ # Mongoose schemas/models
│ ├── routes/ # Express route definitions
│ ├── services/ # Business logic services (if any)
│ ├── app.js # Express app setup
│ ├── package.json # Backend dependencies
│ └── .env # Backend environment variables
├── src/ # React Frontend
│ ├── app/
│ │ ├── components/ # UI components
│ │ ├── contexts/ # React Contexts
│ │ ├── hooks/ # Custom Hooks (including useFirebase)
│ │ ├── models/ # Frontend TypeScript types
│ │ ├── screen/ # Page components
│ │ ├── services/ # Frontend services (api, auth, event, mongo, spotify)
│ │ └── config/ # Frontend config (e.g., firebase client)
│ ├── assets/ # Frontend static assets
│ ├── styles/ # CSS
│ ├── App.tsx # Main frontend component
│ ├── index.tsx # Frontend entry point
│ └── setupTests.js # Jest setup
├── .env # Frontend environment variables
├── .eslintrc.js # ESLint config
├── .prettierrc.json # Prettier config
├── babel.config.cjs # Babel config
├── craco.config.cjs # Craco config (if used)
├── jest.config.cjs # Jest config
├── package.json # Frontend dependencies & scripts
├── tsconfig.json # TypeScript config
└── README.md

### Key Frontend Components & Services

- **`App.tsx`**: Main router setup, context providers.
- **`ProtectedRoute.tsx`**: Handles RBAC for routes.
- **`AuthContext.tsx`**: Manages Firebase auth state.
- **Screen Components (`src/app/screen/`)**: Define application pages.
- **`api.tsx` / `mongoService.tsx`**: Configures Axios client for backend communication.
- **`eventService.tsx`**: Functions to interact with the event API (MongoDB backend).
- **`useFirebase.ts`**: Hook for direct interaction with Firebase Firestore/Storage (clarify its exact role vs. backend API).
- **`playlistService.tsx` / `spotifyService`**: Manage Spotify playlists and playback.
- **`serviceInitializer.tsx`**: Coordinates initialization of auth, API connection, audio, Spotify.

### Key Backend Components

- **`server/app.js`**: Configures Express app, middleware, routes.
- **`server/routes/`**: Defines API endpoints and links them to controllers.
- **`server/controllers/`**: Contains logic to handle requests, interact with models/services.
- **`server/models/`**: Mongoose schemas defining database structure.
- **`server/middleware/auth.js`**: Verifies authentication (Firebase ID tokens).
- **`server/config/`**: Handles database connection, Firebase Admin SDK init.

### Running Linters/Formatters

```bash
# Check frontend linting issues (adjust command based on package.json)
npm run lint
# or
npm run validate:js

# Automatically format frontend code
npm run format

# Check backend linting (if configured in server/package.json)
# cd server && npm run lint && cd ..

### Running Tests

# Run frontend tests using the script defined in package.json
npm test

# Run frontend tests with coverage
npm test -- --coverage

# Run backend tests (if configured in server/package.json)
# cd server && npm test && cd ..
```

## Deployment

### Building for Production

1. Ensure `.env` files in both root and `/server` contain production values (API URLs, database URIs, secrets).
2. Build the frontend:

   ```bash
   npm run build
   ```

### Deployment Strategy

Deploying requires handling both the frontend (static files) and the backend (Node.js application).

1. **Backend Deployment (e.g., Heroku, AWS EC2/ECS, Google Cloud Run, DigitalOcean App Platform):**

   - Deploy the `/server` directory as a Node.js application.
   - Ensure environment variables (MongoDB URI, Firebase Credentials Path/Content, Spotify Secrets, PORT) are set securely in the deployment environment.
   - Make sure the `serviceAccountKey.json` content or path is correctly configured for the Firebase Admin SDK.
   - Configure the backend to listen on the port provided by the platform (e.g., `process.env.PORT`).

2. **Frontend Deployment (e.g., Firebase Hosting, Netlify, Vercel, AWS S3/CloudFront):**

   - Deploy the contents of the `build/` directory generated in the previous step.
   - Configure the hosting to handle client-side routing (rewrite all paths to `index.html`).
   - Ensure the `REACT_APP_API_URL` environment variable during the frontend build process points to the _publicly accessible URL_ of your deployed backend.

3. **Combined Deployment (e.g., Monorepo platforms, Docker):**

   - Use platforms designed for monorepos.
   - Create Docker containers for both frontend (e.g., using Nginx to serve static files) and backend, and manage them with Docker Compose or Kubernetes.

## Troubleshooting

### Common Issues

- **Frontend/Backend Connection:** Verify `REACT_APP_API_URL` (frontend) matches the running backend URL. Check for CORS errors if domains differ in production (configure CORS in `server/app.js`). Ensure the backend server is running and accessible.
- **Authentication:** Double-check all Firebase keys (Web keys for frontend, Service Account for backend). Ensure domains are authorized in Firebase Auth settings. Check token verification logic in backend middleware (`server/middleware/auth.js`) and Firebase Admin SDK initialization (`server/config/firebase.js`).
- **Database:** Confirm MongoDB connection string (`MONGODB_URI` in `server/.env`) is correct and the database server is running/accessible. Check backend logs for Mongoose connection errors.
- **Firebase Firestore vs. MongoDB:** Be aware of potential data inconsistencies if both are used for similar data. Clarify the source of truth. Errors in `useFirebase.ts` relate to Firestore; errors from `eventService.tsx` likely relate to the MongoDB backend API.
- **Spotify Integration:** Verify Spotify Client ID/Secret in both frontend/backend `.env` files. Ensure Redirect URI (`SPOTIFY_REDIRECT_URI`) matches Spotify Developer Dashboard settings exactly. Check for Spotify API rate limits or permission errors. Handle token refresh logic.
- **Environment Variables:** Ensure `.env` files are correctly placed (`/` and `/server`). Remember frontend vars need `REACT_APP_` prefix and are baked in at build time. Backend vars are read at runtime. Check `GOOGLE_APPLICATION_CREDENTIALS` or `FIREBASE_SERVICE_ACCOUNT` for backend Firebase Admin setup.
- **Build Failures:** Check build logs for specific TS/ESLint/dependency errors. Try `rm -rf node_modules && npm install` in both root and `/server`.

### Getting Help

1. **Check Logs:** Browser developer console (Network and Console tabs), backend server logs.
2. **Isolate:** Test frontend and backend APIs independently (e.g., using Postman/curl for backend).
3. **Search:** Use specific error messages to search online, in docs, or issue trackers.
4. **Ask:** Create detailed issue reports including steps to reproduce, error messages, environment details, and what you've already tried.

## CI/CD Pipeline

A CI/CD pipeline (e.g., GitHub Actions) should automate:

1. **Linting & Formatting Checks** (Frontend & Backend)
2. **Type Checking** (Frontend)
3. **Testing** (Frontend & Backend unit/integration tests)
4. **Building Frontend Assets** (`npm run build`)
5. **Deploying Backend** (e.g., pushing code/container to hosting platform)
6. **Deploying Frontend** (e.g., uploading `build/` contents)

Separate jobs or stages will likely be needed for frontend and backend steps. Secure handling of secrets (API keys, DB URIs, service accounts) is critical.

## Contributing

Contributions are welcome!

1. Fork the repository.
2. Create a new branch for your feature or fix (`git checkout -b feature/your-feature`).
3. Make changes in both frontend (`/src`) and backend (`/server`) as needed.
4. Add tests for your changes.
5. Ensure linters and tests pass in both environments.
6. Commit your changes (`git commit -m 'feat: Describe your feature'`). Use conventional commit messages if applicable.
7. Push your branch to your fork (`git push origin feature/your-feature`).
8. Open a Pull Request against the main repository's `develop` or `main` branch.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
