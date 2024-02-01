export default {
  build: {
    config: {
      platform: 'node',
      format: 'esm',
      external: [
				"pg",
				"tedious",
				"pg-hstore",

				"welo/dist/src/utils/block.js",
				"welo/dist/src/utils/replicator.js",
				"welo/dist/src/utils/heads-exchange.js",
				"welo/dist/src/utils/index.js",
				"welo/dist/src/manifest/index.js"
			]
    }
  }
}
