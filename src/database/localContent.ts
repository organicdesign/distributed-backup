import { DataTypes, Model, InferAttributes, InferCreationAttributes } from "sequelize";
import { CID, Version } from "multiformats/cid";
import { sequelize } from "./sequelize.js";

/**
 * This class handles managing local data added to IPFS.
 */

class localContentClass extends Model<InferAttributes<localContentClass, { omit: "cid" | "group" | "versions" | "replacedBy" | "meta" }> & { cid: string, group: string, versions?: string, replacedBy?: string, meta?: string }, InferCreationAttributes<localContentClass>> {
	declare cid: CID // Primary
	declare group: CID // Primary
	declare path: string
	declare state: "UPLOADING" | "COMPLETED" | "DESTROYED"
	declare cidVersion: Version
	declare hash: string
	declare chunker: string
	declare rawLeaves: boolean
	declare nocopy: boolean
	declare encrypt: boolean
	declare timestamp: Date
	declare autoUpdate: boolean
	declare versionCount?: number
	declare versions: CID[]
	declare priority: number
	declare replacedBy?: CID
	declare meta?: Record<string, unknown>
}

export const LocalContent = sequelize.define<localContentClass>(
	"uploads",
	{
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

		path: {
			type: DataTypes.STRING,
			allowNull: false
		},

		state: {
			type: DataTypes.STRING,
			allowNull: false
		},

		cidVersion: {
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
		},

		timestamp: {
			type: DataTypes.DATE,
			allowNull: false,
			defaultValue: new Date()
		},

		autoUpdate: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false
		},

		versionCount: {
			type: DataTypes.INTEGER(),
			allowNull: true
		},

		versions: {
			type: DataTypes.STRING(undefined, true),
			allowNull: true,

			get () {
				const str = this.getDataValue("versions");

				if (str == null) {
					return [];
				}

				const arr: string[] = JSON.parse(str);

				return arr.map(str => CID.parse(str));
			},

			set (value?: CID[]) {
				if (value == null) {
					this.setDataValue("versions", "[]");
					return;
				}

				const arr = value.map(cid => cid.toString());
				const str = JSON.stringify(arr);

				this.setDataValue("versions", str);
			}
		},

		priority: {
			type: DataTypes.INTEGER,
			allowNull: false
		},

		replacedBy: {
			type: DataTypes.STRING(undefined, true),
			allowNull: true,

			get () {
				const str = this.getDataValue("replacedBy");

				return str == null ? str : CID.parse(str);
			},

			set (value?: CID) {
				this.setDataValue("replacedBy", value?.toString());
			}
		},

		meta: {
			type: DataTypes.STRING(undefined, true),
			allowNull: true,

			get () {
				const str = this.getDataValue("meta");

				if (str == null) {
					return {};
				}

				const arr: Record<string, unknown> = JSON.parse(str);

				return arr;
			},

			set (value?: Record<string, unknown>) {
				if (value == null) {
					this.setDataValue("meta", "{}");
					return;
				}

				const str = JSON.stringify(value);

				this.setDataValue("meta", str);
			}
		}
	}
);
