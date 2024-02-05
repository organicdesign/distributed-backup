export default {
  build: {
    config: {
      platform: 'node',
      format: 'esm',
      external: [
        "pg",
        "tedious",
        "pg-hstore"
      ]
    }
  }
}
