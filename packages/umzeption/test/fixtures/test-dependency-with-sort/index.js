/** @satisfies {import('../../../index.js').UmzeptionDependency} */
export const umzeptionConfig = {
  glob: ['migrations/*.js'],
  installSchema: async () => {},
  sortFiles: files => files.toSorted((a, b) => b.localeCompare(a)),
};
