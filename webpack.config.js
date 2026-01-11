const webpack = require('@nativescript/webpack');

module.exports = (env) => {
  webpack.init(env);
  webpack.useConfig('angular');

  webpack.mergeWebpack({
    resolve: {
      fallback: {
        url: false,
      },
    },
  });

  return webpack.resolveConfig();
};

