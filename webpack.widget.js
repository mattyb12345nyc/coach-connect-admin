const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

module.exports = (env, argv) => {
  const isDevelopment = argv.mode === 'development';
  const isProduction = argv.mode === 'production';

  return {
    entry: {
      'customgpt-widget': './src/widget/index.tsx',
    },
    
    mode: isProduction ? 'production' : 'development',
    
    output: {
      path: path.resolve(__dirname, 'dist/widget'),
      filename: isProduction ? '[name].js' : '[name].js', // Removed hash for easier integration
      chunkFilename: isProduction ? '[name].[contenthash].chunk.js' : '[name].chunk.js',
      publicPath: '/',
      clean: true,
      library: {
        name: 'CustomGPTWidget',
        type: 'umd',
        export: 'default',
        umdNamedDefine: true,
      },
      globalObject: 'this', // Critical for UMD + externals
    },

    resolve: {
      extensions: ['.tsx', '.ts', '.js', '.jsx'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },

    module: {
      rules: [
        // TypeScript/JavaScript
        {
          test: /\.(ts|tsx|js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', {
                  targets: 'defaults',
                  modules: false  // Let webpack handle modules, prevents interop helpers
                }],
                ['@babel/preset-react', { runtime: 'automatic' }],
                '@babel/preset-typescript',
              ],
              plugins: [
                '@babel/plugin-proposal-class-properties',
              ],
            },
          },
        },
        
        // CSS with Tailwind
        {
          test: /\.css$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            {
              loader: 'css-loader',
              options: {
                importLoaders: 1,
              },
            },
            {
              loader: 'postcss-loader',
              options: {
                postcssOptions: {
                  plugins: [
                    require('tailwindcss'),
                    require('autoprefixer'),
                  ],
                },
              },
            },
          ],
        },
        
        // Fonts and Assets
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/,
          type: 'asset/resource',
          generator: {
            filename: 'fonts/[name].[hash][ext]',
          },
        },
        
        {
          test: /\.(png|svg|jpg|jpeg|gif)$/,
          type: 'asset/resource',
          generator: {
            filename: 'images/[name].[hash][ext]',
          },
        },
      ],
    },

    plugins: [
      // Define process.env for browser environment
      new webpack.DefinePlugin({
        'process.env': {
          NODE_ENV: JSON.stringify(isProduction ? 'production' : 'development'),
          NEXT_PUBLIC_API_BASE_URL: JSON.stringify(process.env.NEXT_PUBLIC_API_BASE_URL || 'https://app.customgpt.ai/api/v1'),
        },
        'process': {
          env: {
            NODE_ENV: JSON.stringify(isProduction ? 'production' : 'development'),
          },
        },
      }),
      
      new HtmlWebpackPlugin({
        template: './src/widget/index.html',
        filename: 'index.html',
        inject: 'body',
        minify: isProduction,
      }),
      
      ...(isProduction
        ? [
            new MiniCssExtractPlugin({
              filename: '[name].css', // Removed hash for easier integration
              chunkFilename: '[name].[contenthash].chunk.css',
            }),
          ]
        : []),
    ],

    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: isProduction,
            },
          },
        }),
        new CssMinimizerPlugin(),
      ],
      
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            reuseExistingChunk: true,
          },
          common: {
            name: 'common',
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      },
    },

    devServer: {
      static: {
        directory: path.join(__dirname, 'dist/widget'),
      },
      port: 3003,
      hot: true,
      open: true,
      historyApiFallback: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
      },
    },

    externals: {
      // Don't bundle React if it's already available on the host page
      // For UMD builds: lowercase for commonjs, PascalCase for root (browser global)
      // NOTE: We externalize react and react-dom, but NOT react-dom/client
      // because it's a submodule that doesn't exist as a separate global
      ...(env && env.externals ? {
        'react': {
          root: 'React',
          commonjs2: 'react',
          commonjs: 'react',
          amd: 'react'
        },
        'react-dom': {
          root: 'ReactDOM',
          commonjs2: 'react-dom',
          commonjs: 'react-dom',
          amd: 'react-dom'
        },
        // Don't externalize react-dom/client - let webpack bundle it
        // It will use the externalized react-dom internally
      } : {}),
    },

    devtool: isDevelopment ? 'eval-source-map' : 'source-map',
    
    performance: {
      hints: isProduction ? 'warning' : false,
      maxEntrypointSize: 512000,
      maxAssetSize: 512000,
    },
  };
};