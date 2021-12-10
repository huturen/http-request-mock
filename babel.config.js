module.exports = {
  'presets': [
    '@babel/preset-env',
    '@babel/preset-typescript'
  ],
  'plugins': [
    '@babel/plugin-transform-runtime',
    '@babel/plugin-transform-async-to-generator',
    '@babel/plugin-transform-arrow-functions',
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-syntax-dynamic-import',
    '@babel/plugin-proposal-object-rest-spread'
  ]
};
