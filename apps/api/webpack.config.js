const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { workspaceRoot } = require('@nx/devkit');

const isCI = process.env.CI === 'true';
const enginePath = join(
  __dirname,
  '../../libs/prisma-schema/src/generated/prisma/libquery_engine-debian-openssl-3.0.x.so.node',
);

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
        ...(!isCI
          ? [
              {
                from: enginePath,
                to: join(workspaceRoot, '.prisma/client'),
                noErrorOnMissing: false,
              },
            ]
          : []),
        // In order for prisma client to find engine, we copy it into /tmp/prisma-engine if in CI action
        ...(isCI
          ? [
              {
                from: enginePath,
                to: '/tmp/prisma-engines/',
                noErrorOnMissing: false,
              },
            ]
          : []),
        {
          from: enginePath,
          to: join(workspaceRoot, 'apps/api/dist/.prisma/client'),
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
