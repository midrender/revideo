import tailwindcss from '@tailwindcss/postcss';
import cssnano from 'cssnano';

/**
 * Tailwind v4 emits Preflight (its base reset) as global rules in `@layer base`
 * that target `*`, `html`, `h1`-`h6`, `button`, etc. The player ships as an
 * embeddable component, so that reset must not touch the host page. This plugin
 * scopes every base rule to `.revideo-player-root`, mirroring how the v3 setup
 * nested `@tailwind base` inside that selector. Utilities are already scoped via
 * the `important: '.revideo-player-root'` config option.
 */
const scopePreflight = () => ({
  postcssPlugin: 'scope-preflight',
  AtRule: {
    layer(atRule) {
      if (atRule.params !== 'base') {
        return;
      }

      atRule.walkRules(rule => {
        rule.selectors = rule.selectors.map(selector => {
          if (
            selector === 'html' ||
            selector === ':host' ||
            selector === ':root'
          ) {
            return '.revideo-player-root';
          }

          return `.revideo-player-root ${selector}`;
        });
      });
    },
  },
});
scopePreflight.postcss = true;

export default {
  plugins: [
    tailwindcss(),
    scopePreflight(),
    cssnano({
      preset: 'default',
    }),
  ],
};
