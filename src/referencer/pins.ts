import { DataTypes, Model, InferAttributes, InferCreationAttributes } from "sequelize";
import { CID } from "multiformats/cid";
import { sequelize } from "./sequelize.js";

class PinsClass extends Model<InferAttributes<PinsClass, { omit: "cid" }> & { cid: string }, InferCreationAttributes<PinsClass>> {
	declare cid: CID
	declare depth?: number
	declare state: "DOWNLOADING" | "COMPLETED" | "DELETING"
}

export const Pins = sequelize.define<PinsClass>(
	"pin",

	{
		cid: {
			type: DataTypes.STRING(undefined, true),
			allowNull: false,
			primaryKey: true,

			get () {
				const str = this.getDataValue("cid");

				return CID.parse(str);
			},

			set (value: CID) {
				this.setDataValue("cid", value.toString());
			}
		},

		depth: {
			type: DataTypes.INTEGER(),
			allowNull: true
		},

		state: {
			type: DataTypes.STRING,
			allowNull: false,
			defaultValue: "DOWNLOADING"
		}
	}
);