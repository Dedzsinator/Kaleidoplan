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

## Introduction

Kaleidoplan is a comprehensive event management application built with React Native and Expo. It enables organizations to create, manage, and organize events efficiently with features like task assignment, reminder notifications, and location-based services.

The platform serves different user roles:

- **Guests**: Can browse events, view details, and express interest
- **Organizers**: Can manage events, handle assigned tasks, and track status
- **Administrators**: Have full control over events, users, and system settings

## Features

### Guest Features

- View list of events with filtering options (All Events, Upcoming, Happening Now, Past)
- See event details including location on a map
- Express interest in events with "I want to go" functionality
- Receive email reminders about upcoming events
- Beautiful animated UI with parallax effects and smooth transitions

### Organizer Features

- Create and manage events
- Track task assignments and status
- View task history logs
- Coordinate with other organizers
- Update task status (pending, in-progress, completed)

### Admin Features

- User management (add/modify/remove users)
- Assign organizer roles
- Create and oversee events
- View system statistics and reports
- Task assignment and management

### Core System Features

- Firebase authentication
- MongoDB data storage
- Real-time updates
- Email notifications & reminders
- Geolocation integration with Google Maps
- Responsive design for mobile and web
- Dark theme UI

## System Architecture

Kaleidoplan uses a modern tech stack:

- **Frontend**: React Native with Expo framework
- **Styling**: NativeWind (TailwindCSS for React Native)
- **Authentication**: Firebase Authentication
- **Database**: MongoDB
- **Storage**: Firebase Storage
- **Email Service**: Nodemailer with Gmail SMTP
- **Map Integration**: React Native Maps with Expo Location
- **Scheduling**: Node-cron for reminders

## Installation

### Prerequisites

- Node.js v18+ and npm
- MongoDB (local or Atlas)
- Firebase account
- Gmail account for sending notifications

### Setup Steps

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd Kaleidoplan
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the application**

   ```bash
   npx expo start
   ```

4. **Run the backend server**

   ```bash
   npm run server:dev
   ```

5. **Run the development environment with both frontend and backend**

   ```bash
   npm run dev:all
   ```

## Configuration

### Environment Setup

- **Create a .env file in the project root with the following variables:**

  ```bash
  FIREBASE_API_KEY="your-firebase-api-key"
  FIREBASE_AUTH_DOMAIN="your-firebase-auth-domain"
  FIREBASE_PROJECT_ID="your-firebase-project-id"
  FIREBASE_STORAGE_BUCKET="your-firebase-storage-bucket"
  FIREBASE_MESSAGING_SENDER_ID="your-firebase-messaging-sender-id"
  FIREBASE_APP_ID="your-firebase-app-id"
  FIREBASE_MEASUREMENT_ID="your-firebase-measurement-id"

  MONGODB_URI="mongodb://localhost:27017/kaleidoplan"
  REACT_APP_API_URL=http://localhost:3000/api
  MONGODB_DB_NAME="kaleidoplan"
  EMAIL_USER=your-gmail-address@gmail.com
  EMAIL_PASSWORD=your-app-password
  ```

  **Important**: For EMAIL_PASSWORD, use an App Password generated from Google Account settings, not your regular Gmail password, especially for accounts with 2FA enabled.

- Firebase Setup

  1.  Create a Firebase project at firebase.google.com
  2.  Enable Authentication with email/password sign-in
  3.  Create a Firebase Storage bucket
  4.  Generate a service account key and save it as serviceAccountKey.json in the project root

- MongoDB Setup

  1.  Install MongoDB locally or create an Atlas cluster
  2.  Configure your connection string in the .env file
  3.  Initialize the database:

  ```bash
  npm run db:seed
  ```

## User Guide

### Guest Experience

Guests can:

1.  **Browse Events**: The home screen displays upcoming events with filtering options
2.  **View Event Details**: Tap any event to see full information, including location on a map
3.  **Express Interest**: Use the "I Want to Go" button to receive reminders
4.  **Get Directions**: Use the map integration to get directions to the event

### Organizer Experience

Organizers need to log in first:

1.  **Login**: Use organizer credentials to access the organizer dashboard
2.  **View Assigned Tasks**: See all tasks assigned for events
3.  **Update Task Status**: Change task status between "pending", "in-progress", and "completed"
4.  **View Event Details**: Access detailed information about events they're organizing
5.  **Check Task Logs**: See the history of task updates and changes

### Administrator Experience

Admins have full system control:

1.  **User Management**: Add, edit, or remove users from the system
2.  **Role Assignment**: Change user roles between organizer and admin
3.  **Event Creation**: Create new events and assign organizers
4.  **Task Management**: Create tasks for events and assign them to organizers
5.  **System Overview**: View statistics about events, tasks, and users

## Backend Services

### MongoDB Server

The **_mongoServer.js_** script handles all database operations and API endpoints:

```bash
# Start the MongoDB server
npm run server:dev
```

### Key API endpoints

- **_/api/events_** - Event management
- **_/api/tasks_** - Task management
- **_/api/taskLogs_** - Task history logs
- **_/api/events/:eventId/subscribe_** - Register interest in an event
- **_/api/events/:eventId/unsubscribe_** - Remove interest from an event

### Email Notifications

The **_emailService.js_** script sends email notifications and reminders using Nodemailer:

```bash
# Start the email service
npm run email:dev
```

1. **Event Reminders**: Based on user preferences (daily, weekly, monthly)
2. **Day-before Reminders**: Special reminders one day before the event
3. **Task Updates**: Notifications when tasks are assigned or status changes

Reminders are scheduled using node-cron, running every day at 9:00 AM.

## Development Guide

### Project Structure

- `/app`: Main application screens using file-based routing
- `/components`: Reusable UI components
- `/contexts`: React contexts (Auth, etc.)
- `/hooks`: Custom React hooks
- `/services`: API and service integrations
- `/models`: TypeScript interfaces and types
- `/scripts`: Backend scripts for MongoDB and Firebase
- `/assets`: Images, fonts and static assets

### Key Components

#### Screens

- `GuestScreen.tsx`: Landing page for guests with animated event cards and parallax effects
- `EventDetailScreen.tsx`: Detailed event information with map integration
- `TaskDetailScreen.tsx`: Task management for organizers
- `AdminPanelScreen.tsx`: Administration dashboard
- `TaskLogScreen.tsx`: History of task updates

#### Services

- `eventService.tsx`: Event data management
- `mongoService.tsx`: MongoDB API client
- `emailService.js`: Email notification system

### Custom Styles

The project uses NativeWind (Tailwind CSS for React Native) for styling:

```tsx
// Example of styled component
const Button = styled(TouchableOpacity, "bg-primary rounded-lg py-2 px-4");
```

NativeWind allows you to use familiar Tailwind CSS classes directly in your React Native components. For consistent theming, we've defined custom components in the `components/ui/theme.ts` file.

### Working with Maps

The project uses React Native Maps with Expo Location for geolocation services:

```tsx
// Example map implementation
<Map
  style={{ flex: 1 }}
  initialRegion={mapRegion}
  scrollEnabled={true}
  zoomEnabled={true}
>
  <Marker
    coordinate={{ latitude: event.latitude, longitude: event.longitude }}
    title={event.name}
    description={event.location}
  />
</Map>
```

### Running Tests

```bash
# Run all tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm run test -- EventDetailScreen.test.tsx
```

## Deployment

### Local Development

```bash
# Start both frontend and backend
npm run dev:all

# Start only the frontend
npx expo start

# Start only the backend server
npm run server:dev
```

### Raspberry Pi Deployment

```bash
# On the Raspberry Pi
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
sudo apt install -y docker-compose

# Clone the repository
git clone <repository-url>
cd Kaleidoplan

# Create .env file with proper configuration
nano .env

# Run the application using Docker
docker-compose up -d
```

### Porduction Deployment

1. **Build the web version:**

   ```bash
   npm run build
   ```

2. **Serve the production build:** The web version is served on port 5000 by default

   ```bash
   npm run start:prod
   ```

3. **Deploy to Expo EAS:**

   ```bash
   eas build --platform ios
   eas build --platform android
   ```

## Troubleshooting

### Common Issues

#### MongoDB Connection Issues

- Verify MongoDB is running with `mongod --version`
- Check connection string in `.env` file
- Ensure network connectivity to MongoDB server
- Check MongoDB logs for errors: `sudo systemctl status mongod`
- Try connecting with MongoDB Compass to verify credentials

#### Email Notification Issues

- Verify Gmail app password is correct
- Check if less secure apps access is enabled for your Gmail account
- Ensure proper email format in the database
- Test email sending: `npm run email:test`
- Check spam/junk folders for sent emails

#### Firebase Authentication Issues

- Verify Firebase configuration in `.env`
- Check if Authentication service is enabled in Firebase console
- Ensure service account has proper permissions
- Verify with the Firebase Debug Console: `firebase emulators:start --only auth`
- Check browser console for Firebase auth errors

#### Map Integration Issues

- Ensure you have installed required packages:

  ```bash
  npm install react-native-maps expo-location
  ```

- Check if location permissions are properly requested in the app
- Verify Google Maps API key (Android) or Bundle ID (iOS) is correctly set up
- Test with simple map implementation to isolate issues

#### Error Codes Reference

- `E001`: MongoDB connection error
- `E002`: Firebase authentication failed
- `E003`: Email service configuration error
- `E004`: Location permission denied
- `E005`: API request failed

### Getting Help

If you encounter issues not covered in this documentation:

1. Check the error logs in the console
2. Refer to the official documentation for specific technologies:
   - [Expo Documentation](https://docs.expo.dev/)
   - [MongoDB Documentation](https://docs.mongodb.com/)
   - [Firebase Documentation](https://firebase.google.com/docs)
3. Search for similar issues in the GitHub repository
4. Open an issue with detailed reproduction steps

## Contributing

We welcome contributions to Kaleidoplan! Please follow these steps:

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add some amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

Please make sure your code follows the project's coding standards and includes appropriate tests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
