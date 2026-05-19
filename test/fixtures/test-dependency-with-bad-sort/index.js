/** @satisfies {import('../../../index.js').UmzeptionDependency} */
export const umzeptionConfig = {
  glob: ['migrations/*.js'],
  installSchema: async () => {},
  // @ts-expect-error intentional bad value to exercise the per-dep typeof guard
  sortFiles: 42,
};
