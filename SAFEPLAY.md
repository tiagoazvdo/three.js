# SafePlay Three.js distribution

This fork carries a narrow downstream distribution rail for SafePlay Arcade. The
first rail is based on the stable Three.js `r185` release and does not patch
`src/**` or commit generated `build/**` files.

## Branch model

- `dev` follows the fork's upstream default branch.
- `safeplay/r185` is the immutable downstream base at upstream commit
  `2431a09f46f34c560bc8e44b33be0e567723d5b9`.
- Feature branches start from `safeplay/r185`. Engine changes, if later proven
  necessary, must be isolated from distribution-only changes and carry browser
  evidence.

## Distribution contract

Run:

```sh
npm ci
npm run test-safeplay-distribution
npm run test-safeplay-determinism
```

The build writes `safeplay-dist/r185/` with:

- `three.core.min.js` and `three.module.min.js`, produced by the upstream Rollup
  and Terser pipeline;
- `LICENSE.txt`;
- `manifest.json`, containing the full fork and upstream commits, Three.js
  revision and package version, exact build-tool versions, clean-tree state,
  and SHA-256 plus byte length for every shipped file.

The manifest deliberately has no timestamp. Release artifacts must be built
from a clean tree (`dirty: false`). `npm run verify-safeplay` rejects stale,
unexpected, modified, or dirty-tree distributions. `npm run
test-safeplay-determinism` performs two independent builds and compares every
output byte.

The browser smoke test transfers an HTML canvas to a module Worker, constructs
`WebGLRenderer` on the resulting `OffscreenCanvas`, renders into a target,
reads a known pixel back, and verifies `THREE.REVISION`. WebGPU availability is
reported as a non-blocking capability probe; WebGL remains the shipping
contract for this rail.

Generated files are intentionally ignored by Git. CI is the release authority:
it uses a pinned Node.js version and pinned GitHub Actions, verifies
reproducibility, runs the browser smoke, then uploads the directory as an
artifact. SafePlay Arcade vendors files only from a verified manifest and pins
the full fork commit.
