const path = require('path');
const webpack = require("webpack");
const resolve = require("path").resolve;
const CertStore = require('@microsoft/gulp-core-build-serve/lib/CertificateStore');
const CertificateStore = CertStore.CertificateStore || CertStore.default;
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const host = "https://localhost:4321";

let baseConfig = {
  target: "web",
  mode: "development",
  devtool: "source-map",
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    modules: ["node_modules"]
  },

  context: path.resolve(__dirname),
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        options: {
          transpileOnly: true,
          compilerOptions: {
            declarationMap: false
          }
        },
        exclude: /node_modules/
      },
      {
        use: [{
          loader: "@microsoft/loader-cased-file",
          options: {
            name: "[name:lower]_[hash].[ext]"
          }
        }],
        test: /.(jpg|png|woff|eot|ttf|svg|gif|dds)((\\?|\\#).+)?$/
      },
      {
        use: [{
          loader: "html-loader"
        }
        ],
        test: /\\.html$/
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: "@microsoft/loader-load-themed-styles",
            options: {
              async: true
            }
          },
          {
            loader: 'css-loader'
          }
        ]
      },
      {
        test: /\.scss$/,
        use: [
          {
            loader: "@microsoft/loader-load-themed-styles",
            options: {
              async: true
            }
          },
          'css-modules-typescript-loader',
          {
            loader: 'css-loader',
            options: {
              modules: true
            }
          }, // translates CSS into CommonJS
          "sass-loader" // compiles Sass to CSS, using Node Sass by default
        ]
      }
    ]
  },
  plugins: [
    new ForkTsCheckerWebpackPlugin({
      tslint: true
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      'process.env.DEBUG': JSON.stringify(true),
      'DEBUG': JSON.stringify(true)
    })],
  devServer: {
    hot: false,
    contentBase: resolve(__dirname),
    publicPath: "/dist/",
    host: "localhost",
    port: 4321,
    disableHostCheck: true,
    historyApiFallback: true,
    open: true,
    openPage: host + "/temp/workbench.html",
    stats: {
      colors: true,
      chunks: false,
      "errors-only": true
    },
    proxy: { // url re-write for resources to be served directly from src folder
      "/lib/webparts/**/loc/*.js": {
        target: host,
        pathRewrite: { '^/lib': '/src' },
        secure: false
      }
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    https: { // use SPFx certs trusted certs for secure connection
      cert: CertificateStore.instance.certificateData,
      key: CertificateStore.instance.keyData
    }
  },
}

const createConfig = function () {

  // we need only 'externals', 'output' and 'entry' from the original webpack config
  let originalWebpackConfig = require("./temp/_webpack_config.json");
  baseConfig.externals = originalWebpackConfig.externals;
  baseConfig.output = originalWebpackConfig.output;

  // fix: ".js" entry needs to be ".ts"
  // also replaces the path form /lib/* to /src/*
  let newEntry = {};
  const pathToSearch = path.sep + "lib" + path.sep;
  const pathToReplace = path.sep + "src" + path.sep;

  for (const key in originalWebpackConfig.entry) {
    if (originalWebpackConfig.entry.hasOwnProperty(key)) {

      let entry = originalWebpackConfig.entry[key];
      entry = entry.replace(pathToSearch, pathToReplace);
      entry = entry.slice(0, -3) + ".ts";
      newEntry[key] = entry;
    }
  }

  baseConfig.entry = newEntry;

  return baseConfig;
}

module.exports = createConfig();
