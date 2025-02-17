import * as esbuild from "esbuild";
import fs from "node:fs";
import { dirname } from "node:path";
import process from "node:process";

export default function esbuildAddWrapper({
  filter = /.*/,                 // modules to wrap
  loader,                        // wrapper esbuild loader ("jsx", "ts", etc)
  innerName = "wrapped-module",  // alias for wrapped module inside wrapper
  wrapper                        // import spec for the wrapper module
}) {
  const resolveDir = process.cwd();  // for interpreting the wrapper import

  // unique name for this instance in case multiple wrappers are in use
  const name = `add-wrapper:${wrapper}`.replace("|", ":");

  return {
    name,

    setup(build) {
      // Intercept resolution of selected modules and redirect to the wrapper
      build.onResolve({ filter }, async ({ path, namespace, ...args }) => {
        // Avoid mutual recursion by appending our tag to the namespace
        const nameRx = new RegExp(`\\b${name.replace(/(?=\W)/g, "\\")}\\b`);
        if (nameRx.test(namespace)) return undefined;
        namespace = `${name}|${namespace}`;

        // Resolve the inner module being wrapped
        const innerOptions = { ...args, namespace };
        const innerFound = await build.resolve(path, innerOptions);
        if (innerFound.errors.length > 0) {
          innerFound.errors.push({ text: "Couldn't resolve wrapped module" });
          return innerFound;
        }

        // Resolve the specified wrapper module
        const wrapperOptions = { kind: "entry-point", namespace, resolveDir };
        const wrapperFound = await build.resolve(wrapper, wrapperOptions);
        if (wrapperFound.errors.length > 0) {
          wrapperFound.errors.push({ text: "Couldn't resolve module wrapper" });
          return wrapperFound;
        }

        // Redirect to the wrapper
        // - set the namespace to match our loader hook (below)
        // - pass the wrapped module to that hook via pluginData
        // - set a suffix to distinguish different uses of the same wrapper
        return {
          ...wrapperFound,
          namespace: name,
          pluginData: innerFound,  // Pass along the resolved inner module
          suffix: `?${innerFound.namespace}:${innerFound.path}`,
        };
      });

      // Intercept loading the wrapper module to pass pluginData along
      // (I wish the default loader already did this!)
      const loadFilter = { filter: /.*/, namespace: name };
      build.onLoad(loadFilter, async ({ path, pluginData, suffix }) => {
        return {
          contents: await fs.promises.readFile(path, "utf8"),
          loader,
          pluginData,
          resolveDir: dirname(path),
          watchFiles: [path],
        };
      });

      // Intercept resolving the inner module alias to redirect to the
      // actual inner module based on the pluginData passed from above
      const innerFilter = {
        filter: new RegExp(`^${innerName.replace(/(?=\W)/g, "\\")}$`),
        namespace: name,
      };
      build.onResolve(innerFilter, ({ pluginData }) => pluginData);
    },
  };
};
