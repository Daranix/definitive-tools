// @types/swagger-ui-dist only covers the main entry point.
// This declaration covers the subpath we import directly to avoid
// absolute-path.js pulling in the Node.js 'path' built-in.
//
// The es-bundle exports the SwaggerUI factory as CJS module.exports (a callable).
// We declare it as `export default` so `.default` is correctly typed as callable
// when using dynamic import().
declare module 'swagger-ui-dist/swagger-ui-es-bundle.js' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SwaggerUIBundle: (options: any) => void;
  export default SwaggerUIBundle;
}
