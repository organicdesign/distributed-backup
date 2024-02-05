export default {
  build: {
    config: {
      platform: 'node',
      external: [
        "pg",
        "pg-hstore"
      ]
    }
  }
}
