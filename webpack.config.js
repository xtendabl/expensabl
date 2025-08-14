const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const isProduction = process.env.NODE_ENV !== 'development';
const isAnalyze = process.env.ANALYZE === 'true';

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
    chunkFilename: '[name].[contenthash].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
    environment: {
      arrowFunction: false,
      const: false,
    },
  },
  optimization: {
    minimize: isProduction,
    minimizer: isProduction ? [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: false, // Keep console logs for debugging
            drop_debugger: true,
            pure_funcs: ['console.debug'], // Remove debug logs
            passes: 2,
          },
          mangle: {
            safari10: true,
          },
          format: {
            comments: false,
          },
        },
        extractComments: false,
      }),
    ] : [],
    splitChunks: false, // Disable code splitting for Chrome extension compatibility
    runtimeChunk: false,
    moduleIds: 'deterministic',
    usedExports: true,
    sideEffects: true,
    concatenateModules: isProduction,
    removeAvailableModules: isProduction,
    removeEmptyChunks: isProduction,
    mergeDuplicateChunks: true,
    mangleExports: isProduction,
    innerGraph: isProduction,
    providedExports: true,
  },
  performance: {
    hints: isProduction ? 'warning' : false,
    maxEntrypointSize: 512000, // 500 KB
    maxAssetSize: 512000, // 500 KB
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
    ...(isAnalyze ? [new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      reportFilename: 'bundle-report.html',
      openAnalyzer: false,
      generateStatsFile: true,
      statsFilename: 'bundle-stats.json',
    })] : []),
  ],
};

