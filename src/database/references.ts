import { DataTypes, Model, InferAttributes, InferCreationAttributes } from "sequelize";
import { CID } from "multiformats/cid";
import { sequelize } from "./sequelize.js";

/**
 * This class handles remote data added to IPFS.
 */

class ReferencesClass extends Model<InferAttributes<ReferencesClass, { omit: "cid" | "group" }> & { cid: string, group: string }, InferCreationAttributes<ReferencesClass>> {
	declare cid: CID // Primary
	declare group: CID // Primary
	declare state: "BLOCKED" | "DOWNLOADED" | "DOWNLOADING" | "DESTROYED"
	declare encrypted: boolean // This can stay since it won't change unless group/cid changes.
	declare timestamp: Date // This can also stay..
}

export const References = sequelize.define<ReferencesClass>(
	"references",
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

		encrypted: {
			type: DataTypes.BOOLEAN,
			defaultValue: false
		},

		timestamp: DataTypes.DATE,

		state: {
			type: DataTypes.STRING,
			allowNull: false,
			defaultValue: "DOWNLOADING"
		}
	}
);
