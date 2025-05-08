import fs from "node:fs";
import path from "node:path";
import process from "node:process";

export default function esbuildAddWrapper({
  filter,                        // modules to wrap
  innerName = "wrapped-module",  // alias for wrapped module inside wrapper
  wrapper,                       // import spec for the wrapper module
  wrapperLoader,                 // wrapper esbuild loader ("jsx", "ts", etc)
}) {
  if (
    !(filter instanceof RegExp) ||
    !["undefined", "string"].includes(typeof wrapperLoader) ||
    typeof innerName !== "string" ||
    typeof wrapper !== "string"
  ) {
    throw new Error("Bad esbuild-plugin-add-wrapper option values");
  }

  // unique name for this instance in case multiple wrappers are in use
  const slug = wrapper.replace(/[^a-zA-Z0-9_]+/g, "_").replace(/^_|_$/g, "");
  const name = `add-wrapper-${slug}`;
  const unwrap = `unwrap-${slug}`;

  return {
    name,

    async setup(build) {
      const resolveDir = build.initialOptions.absWorkingDir || process.cwd();
      const wrapperPath = path.join(resolveDir, wrapper);
      const wrapperData = {
        contents: await fs.promises.readFile(wrapperPath, "utf8"),
        loader: wrapperLoader,
      };

      // Intercept loading of wrapped modules and redirect to the wrapper
      build.onLoad({ filter }, async (load) => {
        console.debug(`[${name}] wrapping ${path.basename(load.path)}`);
        return wrapperData;
      });

      build.onLoad({ filter, namespace: unwrap }, async (load) => {
        const base = path.basename(load.path);
        console.debug(`[${name}] loading original ${base}`);
        return {
          contents: await fs.promises.readFile(load.path, "utf8")
        }
      });

      const innerFilter = innerName.replace(/[/.*+?|()[]{}\\]/g, "\\$&");
      build.onResolve({ filter: new RegExp(innerFilter) }, async (res) => {
        const base = path.basename(res.importer);
        if (!res.importer.match(filter)) {
          console.debug(`[${name}] ignoring "${res.path}" from ${base}`);
          return null;
        }
        console.debug(`[${name}] resolving "${res.path}" to ${base}`);
        return { path: res.importer, namespace: unwrap };
      });
    }
  };
};
