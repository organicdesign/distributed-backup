import { DataTypes, Model, InferAttributes, InferCreationAttributes } from "sequelize";
import { CID, Version } from "multiformats/cid";
import { sequelize } from "./sequelize.js";

/**
 * This class handles managing local data added to IPFS.
 */

class UploadsClass extends Model<InferAttributes<UploadsClass, { omit: "cid" | "replaces" | "group" | "replacedBy" }> & { cid: string, group: string, replaces?: string, replacedBy?: string }, InferCreationAttributes<UploadsClass>> {
	declare cid: CID // Primary
	declare group: CID // Primary
	declare path: string
	declare state: "UPLOADING" | "COMPLETED"
	declare cidVersion: Version
	declare hash: string
	declare chunker: string
	declare rawLeaves: boolean
	declare nocopy: boolean
	declare encrypt: boolean
	declare timestamp: Date
	declare autoUpdate: boolean
	declare replaces?: CID
	declare replacedBy?: CID
}

export const Uploads = sequelize.define<UploadsClass>(
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

		replaces: {
			type: DataTypes.STRING(undefined, true),
			allowNull: true,

			get () {
				const str = this.getDataValue("replaces");

				return str == null ? str : CID.parse(str);
			},

			set (value: CID) {
				this.setDataValue("replaces", value.toString());
			}
		},

		replacedBy: {
			type: DataTypes.STRING(undefined, true),
			allowNull: true,

			get () {
				const str = this.getDataValue("replacedBy");

				return str == null ? str : CID.parse(str);
			},

			set (value: CID) {
				this.setDataValue("replacedBy", value.toString());
			}
		}
	}
);
