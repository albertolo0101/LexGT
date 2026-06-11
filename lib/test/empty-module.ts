// Stub for the `server-only` package, which has no exports of its own and
// only exists to throw at build time if imported from client code. Vitest
// runs in a Node environment where the real package isn't resolvable.
export {};
