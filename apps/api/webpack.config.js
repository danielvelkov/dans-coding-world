const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  output: {
    path: join(__dirname, 'dist'),
  },
  devtool: false,
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: true,
      sourceMap: false,
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: join(
            __dirname,
            '../../libs/prisma-schema/src/generated/prisma/libquery_engine-debian-openssl-3.0.x.so.node',
          ),
          to: '.',
          noErrorOnMissing: false,
        },
      ],
    }),
  ],
  ignoreWarnings: [
    {
      module: /prisma/,
      message: /Failed to parse source map/,
    },
  ],
};
