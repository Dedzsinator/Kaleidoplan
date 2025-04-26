export default {
  presets: ['@babel/preset-env', '@babel/preset-react', '@babel/preset-typescript'],
  plugins: [
    [
      'transform-define',
      {
        'process.env.REACT_APP_API_URL': process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
      },
    ],
    process.env.NODE_ENV === 'development' && 'react-refresh/babel',
  ].filter(Boolean),
};
