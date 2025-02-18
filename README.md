# esbuild-plugin-add-wrapper
This is a plugin for [esbuild](esbuild.github.io) to redirect imports of specified modules to a given wrapper module, which may then import and use the original module and expose, modify, extend and/or reinterpret its interface as desired.

This is similar to the built-in esbuild [`alias`](https://esbuild.github.io/api/#alias) and [`inject`](https://esbuild.github.io/api/#inject) features, with some notable differences
- Unlike `inject`, the substitution applies automatically to all users of a module
- Unlike `alias`, the replacement (wrapper) module can access the "underlying" module
- Unlike either, one wrapper can be applied individually to many target modules

## Why?

The motivating example was wrapping [MDX](https://mdxjs.com/) output to add a bit of code to render the content in the DOM, suitable to directly import into HTML via [esbuild-plugin-html](https://github.com/craftamap/esbuild-plugin-html).

## Usage

Install the plugin
```
npm i esbuild-plugin-add-wrapper
```

When you invoke `esbuild.build(...)` in your build script, pass the plugin
```
import * as esbuild from "esbuild";
import esbuildAddWrapper from "esbuild-plugin-add-wrapper";
...
await esbuild.build({
  bundle: true,
  ... other esbuild options ...
  plugins: [
    esbuildAddWrapper({
      filter: /imports?-to-wrap/,
      loader: "js",
      innerName = "
      wrapper: "./my_wrapper.js",
    }),
    ...
  ],
});
```

The plugin's constructor takes these arguments:
- `filter`: (RegExp, required) regexp matching modules to apply the wrapper to
- `loader`: (string, default `"js"`) loader to use for the wrapper
- `wrapper`: (string, required) the wrapper module
- `innerName`: (string, default `"wrapped-module"`) placeholder for wrapper to import

The wrapper module must be a plain old file, and the module specification must be something like `"./wrapper.js"` that could be imported. A copy of the wrapper module will be separately imported for every wrapped module, and when the wrapper imports the placeholder (eg. `import inner from "wrapped module"`), it will import the module it's wrapping.
