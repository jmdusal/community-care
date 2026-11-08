// Metro config: lets the app import the shared design tokens from packages/design-tokens.
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const tokens = path.resolve(__dirname, '../../packages/design-tokens');

config.watchFolders = [...(config.watchFolders ?? []), tokens];
config.resolver.extraNodeModules = { ...(config.resolver.extraNodeModules ?? {}), '@communitycare/design-tokens': path.join(tokens, 'src') };

module.exports = config;
