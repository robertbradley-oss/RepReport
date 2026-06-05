export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (error.code === "ERR_MODULE_NOT_FOUND" && isExtensionlessRelativeImport(specifier)) {
      return nextResolve(`${specifier}.ts`, context);
    }

    throw error;
  }
}

function isExtensionlessRelativeImport(specifier) {
  return (specifier.startsWith("./") || specifier.startsWith("../")) && !specifier.split("/").at(-1).includes(".");
}
