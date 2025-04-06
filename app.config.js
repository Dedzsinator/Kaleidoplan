export default {
  expo: {
    name: "Kaleidoplan",
    slug: "kaleidoplan",
    scheme: "kaleidoplan",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.kaleidoplan.app"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.kaleidoplan.app"
    },
    web: {
      favicon: "./assets/images/favicon.jpg",
      bundler: "metro"
    },
    plugins: [
      "expo-secure-store"
    ],
    extra: {
      // Securely load from .env file
      mongodbUri: process.env.MONGODB_URI,
      mongodbDbName: process.env.MONGODB_DB_NAME,
      encryptionKey: process.env.ENCRYPTION_KEY,
      spotifyClientId: process.env.SPOTIFY_CLIENT_ID,
      spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      eas: {
        projectId: "your-eas-project-id"
      }
    }
  }
};