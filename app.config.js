export default {
    name: 'Kaleidoplan',
    version: '1.0.0',
    extra: {
      mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    },
  };