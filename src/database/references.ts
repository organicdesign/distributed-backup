import { DataTypes, Model, InferAttributes, InferCreationAttributes } from "sequelize";
import { CID } from "multiformats/cid";
import { sequelize } from "./sequelize.js";

class ReferencesClass extends Model<InferAttributes<ReferencesClass, { omit: "cid" | "group" }> & { cid: string, group: string }, InferCreationAttributes<ReferencesClass>> {
	declare cid: CID
	declare group: CID
	declare encrypted: boolean // This can stay since it won't change if group/cid changes.
	declare timestamp: Date // This can also stay.
	declare blocked: boolean // This is local data so it must stay.

	// This is a flag to say if it has been destoyed, pending unpinning.
	declare destroyed: boolean
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

		blocked: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false
		},

		destroyed: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false
		}
	}
);
