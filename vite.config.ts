import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Project page (github.com/greysonpeck/poc-dot-density -> greysonpeck.github.io/poc-dot-density/),
  // not a user page at domain root, so built asset paths need this prefix. Only for `vite build` —
  // `vite dev` must stay at "/" or local dev URLs break.
  base: command === 'build' ? '/poc-dot-density/' : '/',
}))
