// Ambient declarations for the docs app.
//
// TypeScript 6.0 errors on side-effect imports of modules it can't resolve to
// types (e.g. `import "./globals.css"` in src/app/layout.tsx). Next's own types
// only declare CSS *modules* (`*.module.css`), so declare the plain global-CSS
// side-effect import here. The more specific `*.module.css` declaration still
// wins for CSS modules.
declare module '*.css';
