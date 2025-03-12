// ./esbuild/exclude-node-modules.ts
import type { Plugin, PluginBuild } from 'esbuild';

const excludeNodeModulesPlugin: Plugin = {
  name: 'exclude-node-modules',
  setup(build: PluginBuild) {
    const options = build.initialOptions;
    
    // Initialize external array if it doesn't exist
    options.external ??= [];
    
    // Add the node-specific modules you want to exclude
    options.external.push('sharp', 'onnxruntime-node');
  },
};

export default excludeNodeModulesPlugin;