import { DataTypes, Model, InferAttributes, InferCreationAttributes } from "sequelize";
import { CID } from "multiformats/cid";
import { sequelize } from "./sequelize.js";

class PinsClass extends Model<InferAttributes<PinsClass, { omit: "cid" }> & { cid: string }, InferCreationAttributes<PinsClass>> {
	declare cid: CID
	declare depth: number
	declare completed: boolean
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
			type: DataTypes.INTEGER({ unsigned: true }),
			allowNull: false
		},

		completed: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false
		}
	}
);
