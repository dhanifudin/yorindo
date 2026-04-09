import coreWebVitals from 'eslint-config-next/core-web-vitals'
import typescript from 'eslint-config-next/typescript'

const eslintConfig = [
  { ignores: ['public/sw.js', 'public/workbox-*.js', 'public/mockServiceWorker.js', 'scripts/**'] },
  ...coreWebVitals,
  ...typescript,
]

export default eslintConfig
