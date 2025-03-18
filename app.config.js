export default {
  name: 'Kaleidoplan',
  version: '1.0.0',
  extra: {
    mongodbUri: process.env.MONGODB_URI,
    mongodbDbName: process.env.MONGODB_DB_NAME,
    encryptionKey: process.env.ENCRYPTION_KEY,
  },
};