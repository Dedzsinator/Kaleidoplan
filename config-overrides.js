// filepath: /home/deginandor/Documents/Programming/Kaleidoplan/config-overrides.cjs
import path from 'path';

// In CommonJS, __dirname is readily available and refers to the directory of the current module.
// No need for fileURLToPath or import.meta.url here.

module.exports = function override(config) {
  config.resolve = {
    ...config.resolve,
    alias: {
      ...config.resolve.alias, // Preserve existing CRA aliases
      '@': path.resolve(__dirname, 'src'),
      '@app': path.resolve(__dirname, 'src/app'),
      '@components': path.resolve(__dirname, 'src/app/components'),
      '@screens': path.resolve(__dirname, 'src/app/screen'),
      '@services': path.resolve(__dirname, 'src/app/services'),
      '@hooks': path.resolve(__dirname, 'src/app/hooks'),
      '@models': path.resolve(__dirname, 'src/app/models'),
      '@styles': path.resolve(__dirname, 'src/app/styles'),
      '@contexts': path.resolve(__dirname, 'src/app/contexts'),
      '@utils': path.resolve(__dirname, 'src/utils'),
    },
  };
  return config;
};
