const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  entry: {
    background: './src/chrome/service-worker.ts',
    content: './src/chrome/content.ts',
    sidepanel: './src/chrome/sidepanel.ts',
  },
  target: 'webworker', // Optimize for service worker environment
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    environment: {
      arrowFunction: false,
      const: false,
    },
  },
  optimization: {
    minimize: false,
  },
  devtool: false, // Disable source maps for production
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
      __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
      // Logger environment variables
      LOGGER_CONSOLE_ENABLED:
        process.env.LOGGER_CONSOLE_ENABLED !== undefined
          ? JSON.stringify(process.env.LOGGER_CONSOLE_ENABLED === 'true')
          : undefined,
      LOGGER_STORAGE_ENABLED:
        process.env.LOGGER_STORAGE_ENABLED !== undefined
          ? JSON.stringify(process.env.LOGGER_STORAGE_ENABLED === 'true')
          : undefined,
      LOGGER_LEVEL: process.env.LOGGER_LEVEL ? JSON.stringify(process.env.LOGGER_LEVEL) : undefined,
    }),
    new CopyPlugin({
      patterns: [
        { from: 'public', to: '.' },
        { from: 'manifest.json', to: '.' },
      ],
    }),
  ],
};

