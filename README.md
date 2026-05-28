# Carribu Parent App

A React Native (Expo) mobile application for parents to track school transport in real-time, communicate with drivers, and manage their children's transportation.

## Features

- **Real-time Tracking** — Live map view of your child's school bus
- **Chat** — Direct messaging with the driver
- **Notifications** — Alerts for pickup, drop-off, and delays
- **Profile Management** — Manage parent and children details

## Tech Stack

- React Native with Expo SDK 55
- React Navigation (native stack + bottom tabs)
- Socket.IO for real-time communication
- Axios for REST API calls
- Expo Location & React Native Maps

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [EAS CLI](https://docs.expo.dev/build/setup/) (for building APK)
- [Expo Go](https://expo.dev/client) app on your phone (for local testing)

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

3. **Configure environment**

   Create a `.env` file in the project root with your API settings:

   ```env
   API_BASE_URL=http://your-api-server:port
   ```

4. **Set up Google Maps API key** (optional, for map features)

   Add your key in `app.json` under `expo.android.config.googleMaps.apiKey`.

## Local Testing

Start the Expo development server:

```bash
npm start
```

Then choose how to run the app:

| Method | Command |
|--------|---------|
| Expo Go (scan QR code) | `npm start` |
| Android emulator | `npm run android` |
| iOS simulator (macOS only) | `npm run ios` |

> **Tip:** Install the [Expo Go](https://expo.dev/client) app on your phone and scan the QR code from the terminal to test on a real device.

## Building the APK

This project uses [EAS Build](https://docs.expo.dev/build/introduction/) to create Android builds in the cloud.

### First-time setup

```bash
npm install -g eas-cli
eas login
```

### Build a preview APK (for testing)

```bash
npm run build:apk
```

Or use the PowerShell script:

```powershell
./build-apk.ps1
```

### Build a production AAB (for Play Store)

```bash
npm run build:aab
```

### Build profiles

| Profile | Output | Use case |
|---------|--------|----------|
| `preview` | APK | Internal testing, sharing with testers |
| `production` | AAB | Google Play Store submission |
| `development` | Dev client | Development with native modules |

Once the build completes, download the APK from [expo.dev](https://expo.dev).

## Project Structure

```
carribu_parent_app/
├── App.js                  # Entry point with navigation setup
├── src/
│   ├── contexts/
│   │   └── AuthContext.js  # Authentication state management
│   ├── screens/
│   │   ├── LoginScreen.js
│   │   ├── TrackingScreen.js
│   │   ├── ChatScreen.js
│   │   ├── NotificationsScreen.js
│   │   └── ProfileScreen.js
│   └── services/
│       ├── api.js          # REST API client (Axios)
│       └── socket.js       # Socket.IO real-time connection
├── app.json                # Expo configuration
├── eas.json                # EAS Build profiles
├── build-apk.ps1           # APK build script
└── package.json
```

## License

See [LICENSE](LICENSE) for details.