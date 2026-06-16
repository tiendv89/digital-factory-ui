// Runtime environment configuration consumed by the browser as `window.__ENV__`.
//
// In production this file is REGENERATED at container startup by
// docker-entrypoint.sh from the container's environment variables, so a single
// Docker image can be pointed at any backend without rebuilding.
//
// The values below are the local-dev defaults used by `next dev` / `next start`
// when the entrypoint has not run. Leaving a value empty makes the app fall back
// to the build-time NEXT_PUBLIC_* value (from .env / .env.local) and then to a
// hard-coded default.
window.__ENV__ = {
  BFF_URL: "",
};
