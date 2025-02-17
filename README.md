# esbuild-plugin-add-wrapper
This is a plugin for [esbuild](esbuild.github.io) to redirect imports of specified modules to a given wrapper module, which may then import and use the original module and expose, modify, extend and/or reinterpret its interface as desired.

This is similar to the built-in esbuild [`alias`](https://esbuild.github.io/api/#alias) and [`inject`](https://esbuild.github.io/api/#inject) features, with some notable differences
- Unlike `inject`, the substitution applies automatically to all users of a module
- Unlike `alias`, the replacement (wrapper) module can access the "underlying" module
- Unlike either, one wrapper can be applied individually to many target modules

## Why?
Pre-existing modules or code generator output may not have exactly the desired interface. Interface adapters (wrappers) can be useful but replacing all uses of the original may be tricky. This plugin lets you do that, in bulk as needed, as part of the build process.

Some motivating examples
- mass-adapting content translator output ([MDX](https://mdxjs.com/)/[MD](https://github.com/martonlederer/esbuild-plugin-markdown), [templated HTML](https://github.com/inqnuam/esbuild-plugin-handlebars), etc.) to fit a particular context
