import { DataTypes, Model, InferAttributes, InferCreationAttributes } from "sequelize";
import { CID, Version } from "multiformats/cid";
import { sequelize } from "./sequelize.js";

class UploadsClass extends Model<InferAttributes<UploadsClass, { omit: "cid" | "group" }> & { cid: string, group: string }, InferCreationAttributes<UploadsClass>> {
	declare cid: CID
	declare group: CID
	declare path: string
	declare cidVersion: Version
	declare hash: string
	declare chunker: string
	declare rawLeaves: boolean
	declare nocopy: boolean
	declare encrypt: boolean
	declare checkedAt: Date

	// This is a flag to say if it has been added to the group or not.
	declare grouped: boolean
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

		checkedAt: {
			type: DataTypes.DATE,
			allowNull: false,
			defaultValue: new Date()
		},

		grouped: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false
		}
	}
);