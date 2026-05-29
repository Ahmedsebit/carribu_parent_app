# Carribu Parent App

A React Native (Expo) mobile application for parents to track school transport in real-time, communicate with drivers, and manage their children's transportation. Part of the Carribu school transport platform.

## Features

- **Real-time Tracking** — Live map view of your child's school bus
- **Chat** — Direct messaging with the driver
- **Notifications** — Alerts for pickup, drop-off, and delays
- **Absence Reporting** — Notify driver when your child won't be on the bus
- **Profile Management** — Manage parent and children details
- **App Version Check** — Automatic update detection

## Tech Stack

- **Framework:** React Native with Expo SDK 55
- **Navigation:** React Navigation (native stack + bottom tabs)
- **State Management:** React Context API
- **HTTP Client:** Axios
- **Real-time:** Socket.IO client
- **Maps:** react-native-maps + Expo Location
- **Storage:** AsyncStorage for token/session persistence
- **Build Service:** EAS Build (Expo Application Services)

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (`npm install -g expo-cli`)
- [EAS CLI](https://docs.expo.dev/build/setup/) (included as dependency, or install globally with `npm install -g eas-cli`)
- [Expo Go](https://expo.dev/client) app on your phone (for local testing)
- An [Expo account](https://expo.dev/signup) (required for EAS builds)
- The Carribu backend API server running locally or accessible via network

## Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/Ahmedsebit/carribu_parent_app.git
   cd carribu_parent_app
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure the API base URL**

   Edit `src/services/api.js` and `src/services/socket.js` to point to your backend server:

   - **Android Emulator:** Use `http://10.0.2.2:5000` (maps to host machine's localhost)
   - **iOS Simulator:** Use `http://localhost:5000`
   - **Physical Device:** Use your machine's LAN IP (run `ipconfig` on Windows or `ifconfig` on Mac/Linux), e.g. `http://192.168.1.100:5000`

4. **Set up Google Maps API key** (optional, for map features)

   Add your key in `app.json` under `expo.android.config.googleMaps.apiKey`.

5. **Log in to Expo (for builds)**

   ```bash
   npx eas-cli login
   ```

## Running Locally

Start the Expo development server:

```bash
npm start
```

Then choose how to run the app:

- **Android Emulator:** Press `a` to open on a connected Android emulator
- **iOS Simulator:** Press `i` to open on the iOS simulator (macOS only)
- **Physical Device:** Scan the QR code with Expo Go

### Platform-specific shortcuts

```bash
# Launch directly on Android
npm run android

# Launch directly on iOS
npm run ios
```

## Project Structure

```
carribu_parent_app/
├── App.js                      # Entry point with navigation setup
├── src/
│   ├── contexts/
│   │   └── AuthContext.js      # Authentication state management
│   ├── screens/
│   │   ├── LoginScreen.js      # Parent login
│   │   ├── TrackingScreen.js   # Live bus tracking map
│   │   ├── ChatScreen.js       # Messaging with driver
│   │   ├── NotificationsScreen.js  # Alerts & notifications
│   │   └── ProfileScreen.js    # Parent profile & settings
│   └── services/
│       ├── api.js              # REST API client (Axios)
│       └── socket.js           # Socket.IO real-time connection
├── scripts/
│   └── bump-version.js         # Semantic version bump utility
├── build-apk.ps1              # PowerShell APK build script
├── app.json                    # Expo configuration
├── eas.json                    # EAS Build profiles
└── package.json                # Dependencies & scripts
```

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `npm start` | `expo start` | Start Expo dev server |
| `npm run android` | `expo start --android` | Launch on Android |
| `npm run ios` | `expo start --ios` | Launch on iOS |
| `npm run build:apk` | `eas build --platform android --profile preview` | Build distributable APK |
| `npm run build:aab` | `eas build --platform android --profile production` | Build AAB for Google Play |
| `npm run version:patch` | `node scripts/bump-version.js patch` | Bump patch version |
| `npm run version:minor` | `node scripts/bump-version.js minor` | Bump minor version |
| `npm run version:major` | `node scripts/bump-version.js major` | Bump major version |

## API Endpoints Used

| Module     | Endpoints                                              |
|------------|--------------------------------------------------------|
| Auth       | `POST /api/auth/login`, `GET /api/auth/me`, `PUT /api/auth/change-password`, `PUT /api/auth/profile` |
| Location   | `GET /api/location/my-bus`, `GET /api/location/bus/:id` |
| Students   | `GET /api/students`                                    |
| Messages   | `GET /api/messages/conversations`, `GET /api/messages/thread/:id`, `POST /api/messages`, `POST /api/messages/absence`, `GET /api/messages/notifications`, `GET /api/messages/my-drivers` |
| App Version | `GET /api/app-versions/latest/:appName`               |

## WebSocket Events

| Event             | Direction | Description                              |
|-------------------|-----------|------------------------------------------|
| `track-trip`      | Emit      | Subscribe to live bus location updates   |
| `location-update` | Listen    | Receive real-time driver GPS coordinates |
| `chat-message`    | Emit      | Send a chat message to the driver        |
| `new-message`     | Listen    | Receive incoming chat messages           |
| Notifications     | Listen    | Pickup, drop-off, and delay alerts       |

## Building the APK

This project uses [EAS Build](https://docs.expo.dev/build/introduction/) to create Android builds in the cloud.

### First-time setup

```bash
# Log in to your Expo account
npx eas-cli login

# Connect project to Expo (already done — project ID: 5a7e2785-c184-4c0f-9647-7adaeac12da8)
npx eas-cli init --id 5a7e2785-c184-4c0f-9647-7adaeac12da8
```

### Build commands

```bash
# Build a preview APK for testing
npm run build:apk

# Build a production AAB for Google Play
npm run build:aab

# Or use the PowerShell script
./build-apk.ps1                    # Default: preview APK
./build-apk.ps1 -Profile production  # Production AAB
```

EAS Build runs in the cloud. Once complete, download the APK from [expo.dev](https://expo.dev).

### Build profiles (eas.json)

| Profile | Output | Use case |
|---------|--------|----------|
| `development` | Dev client | Development with native modules |
| `preview` | APK | Internal testing / QA distribution |
| `production` | AAB | Google Play Store submission |

### iOS builds

iOS builds require Apple Developer credentials. Run interactively:

```bash
npx eas-cli build --platform ios --profile production
```

## App Identifiers

| Detail | Value |
|--------|-------|
| Android Package | `com.carribu.parent` |
| iOS Bundle ID | `com.carribu.parent` |
| Expo Owner | `firstbodis-organization` |
| Expo Slug | `school-transport-parent` |
| Expo Project ID | `5a7e2785-c184-4c0f-9647-7adaeac12da8` |
| Expo Dashboard | [expo.dev/accounts/firstbodis-organization/projects/school-transport-parent](https://expo.dev/accounts/firstbodis-organization/projects/school-transport-parent) |

## Versioning

This project follows [Semantic Versioning](https://semver.org/) (MAJOR.MINOR.PATCH). Version bumps automatically sync `package.json` and `app.json`.

### Commands

```bash
# Patch release (bug fixes): 2.0.0 → 2.0.1
npm run version:patch

# Minor release (new features): 2.0.0 → 2.1.0
npm run version:minor

# Major release (breaking changes): 2.0.0 → 3.0.0
npm run version:major
```

After bumping, commit and push:

```bash
git add package.json app.json
git commit -m "chore: bump version to vX.Y.Z"
git push
```

## Environment Notes

- Supported platforms: iOS, Android, and Web
- The backend server must be running for login and all features to work
- Google Maps API key is required for the tracking map on Android
- App uses the `expo-location` plugin for background location access

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Network errors on login | Verify the API base URL matches your setup (emulator vs physical device) and that the backend is running |
| Map not showing | Ensure Google Maps API key is set in `app.json` under `expo.android.config.googleMaps.apiKey` |
| Location not updating | Ensure location permissions are granted in device settings |
| Socket not connecting | Check that the socket URL in `src/services/socket.js` matches your backend address |
| EAS build fails | Run `npx eas-cli login` and verify your Expo account has access |
| iOS build credentials error | Run the build interactively to set up Apple credentials |

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.