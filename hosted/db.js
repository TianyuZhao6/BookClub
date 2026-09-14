export const database = binding => ({
  first: (sql, ...args) => binding.prepare(sql).bind(...args).first(),
  all: async (sql, ...args) => (await binding.prepare(sql).bind(...args).all()).results,
  run: (sql, ...args) => binding.prepare(sql).bind(...args).run(),
  batch: statements => binding.batch(statements.map(([sql, ...args]) => binding.prepare(sql).bind(...args)))
});
