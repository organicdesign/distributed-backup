import { Sequelize, DataTypes, Model, InferAttributes, InferCreationAttributes } from "sequelize";
import { CID } from "multiformats/cid";
import { toString as uint8ArrayToString, fromString as uint8ArrayFromString } from "uint8arrays";

const sequelize = new Sequelize( {
	dialect: "sqlite",
	storage: ":memory:",
	logging: false
});

export class Reference extends Model<InferAttributes<Reference, { omit: "cid" | "group" | "author" | "next" | "prev" | "meta" }> & { cid: string, group: string, author: string, next?: string, prev?: string, meta?: string }, InferCreationAttributes<Reference>> {
	declare cid: CID
	declare group: CID
	declare author: Uint8Array
	declare timestamp: Date
	declare prev?: CID
	declare next?: CID
	declare meta?: Record<string, unknown>
	declare blocked: boolean
	declare downloaded: number
}

Reference.init({
	cid: {
		type: DataTypes.STRING(undefined, true),
		primaryKey: true,
		allowNull: false,

		get () {
			const str = this.getDataValue("cid");

			return CID.parse(str);
		},

		set (value: CID) {
			this.setDataValue("cid", value.toString());
		}
	},

	group: {
		type: DataTypes.STRING(undefined, true),
		primaryKey: true,
		allowNull: false,

		get () {
			const str = this.getDataValue("group");

			return CID.parse(str);
		},

		set (value: CID) {
			this.setDataValue("group", value.toString());
		}
	},

	author: {
		type: DataTypes.STRING(undefined, true),

		get () {
			const str = this.getDataValue("author");

			return uint8ArrayFromString(str);
		},

		set (value: Uint8Array) {
			this.setDataValue("author", uint8ArrayToString(value));
		}
	},

	timestamp: DataTypes.DATE,

	prev: {
		type: DataTypes.STRING(undefined, true),
		allowNull: true,

		get () {
			const str = this.getDataValue("prev");

			if (str == null) {
				return undefined;
			}

			return CID.parse(str);
		},

		set (value: CID) {
			this.setDataValue("prev", value.toString());
		}
	},

	next: {
		type: DataTypes.STRING(undefined, true),
		allowNull: true,

		get () {
			const str = this.getDataValue("next");

			if (str == null) {
				return undefined;
			}

			return CID.parse(str);
		},

		set (value: CID) {
			this.setDataValue("next", value.toString());
		}
	},

	meta: {
		type: DataTypes.STRING,
		allowNull: true,

		get () {
			const str = this.getDataValue("meta");

			if (str == null) {
				return undefined;
			}

			return JSON.parse(str);
		},

		set (value: Record<string, undefined>) {
			this.setDataValue("meta", JSON.stringify(value));
		}
	},

	blocked: {
		type: DataTypes.BOOLEAN,
		allowNull: false,
		defaultValue: false
	},

	downloaded: {
		type: DataTypes.NUMBER,
		allowNull: false,
		defaultValue: 0
	}
}, { sequelize, hooks: {
		async afterDestroy (reference) {
			const upload = await Upload.findOne({
				where: {
					cid: reference.dataValues.cid,
					group: reference.dataValues.group
				}
			});

			if (upload == null) {
				return;
			}

			await upload.destroy();
		}
	}
});

export class Upload extends Model<InferAttributes<Upload, { omit: "cid" | "group" }> & { cid: string, group: string }, InferCreationAttributes<Upload>> {
	declare cid: CID
	declare group: CID
	declare version: number
	declare hash: string
	declare chunker: string
	declare rawLeaves: boolean
	declare nocopy: boolean
	declare encrypt: boolean
}

Upload.init({
	cid: {
		type: DataTypes.STRING(undefined, true),
		primaryKey: true,
		allowNull: false,

		get () {
			const str = this.getDataValue("cid");

			return CID.parse(str);
		},

		set (value: CID) {
			this.setDataValue("cid", value.toString());
		}
	},

	group: {
		type: DataTypes.STRING(undefined, true),
		primaryKey: true,
		allowNull: false,

		get () {
			const str = this.getDataValue("group");

			return CID.parse(str);
		},

		set (value: CID) {
			this.setDataValue("group", value.toString());
		}
	},

	version: {
		type: DataTypes.NUMBER,
		allowNull: false,
		defaultValue: 1
	},

	hash: {
		type: DataTypes.STRING,
		allowNull: false,
		defaultValue: "sha2-256"
	},

	chunker: {
		type: DataTypes.STRING,
		allowNull: false,
		defaultValue: "size-262144"
	},

	rawLeaves: {
		type: DataTypes.BOOLEAN,
		allowNull: false,
		defaultValue: true
	},

	nocopy: {
		type: DataTypes.BOOLEAN,
		allowNull: false,
		defaultValue: false
	},

	encrypt: {
		type: DataTypes.BOOLEAN,
		allowNull: false,
		defaultValue: false
	}
}, { sequelize });

await sequelize.sync();
