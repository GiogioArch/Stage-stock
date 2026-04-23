// ESLint config — Phase N.0d. Config volontairement tolérante :
// objectif = attraper les vrais bugs (unused, unreachable, undef) sans bloquer
// le flow de dev. On durcira progressivement.
module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier', // désactive les règles de style qui conflictent avec Prettier
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  settings: { react: { version: 'detect' } },
  ignorePatterns: [
    'dist',
    'node_modules',
    'public/sw.js', // service worker custom
    'scripts/*.cjs',
    '.wrangler',
  ],
  rules: {
    // React
    'react/react-in-jsx-scope': 'off', // React 17+ JSX transform
    'react/prop-types': 'off', // pas de PropTypes dans ce projet
    'react/no-unknown-property': 'off', // false positives sur cmdk-input-wrapper etc.
    'react/no-unescaped-entities': 'off', // du français courant (l'app, d'autres, etc.)

    // JS
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-empty': ['warn', { allowEmptyCatch: true }],
    'no-constant-condition': ['warn', { checkLoops: false }],
    'no-case-declarations': 'warn',
    'no-useless-escape': 'warn',
    'no-prototype-builtins': 'off',
    'no-undef': 'error', // attrape les vraies fautes de frappe

    // React Hooks - on garde les règles critiques, on désactive les règles
    // expérimentales React 19 (purity, immutability, static-components, etc.)
    // qui sont trop strictes pour React 18 et notre codebase.
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'react-hooks/purity': 'off',
    'react-hooks/immutability': 'off',
    'react-hooks/set-state-in-effect': 'off',
    'react-hooks/set-state-in-render': 'off',
    'react-hooks/static-components': 'off',
    'react-hooks/preserve-manual-memoization': 'off',
    'react-hooks/refs': 'off',
  },
}
