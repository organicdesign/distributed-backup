import { DataTypes, Model, InferAttributes, InferCreationAttributes } from "sequelize";
import { CID } from "multiformats/cid";
import { sequelize } from "./sequelize.js";

class PinsClass extends Model<InferAttributes<PinsClass, { omit: "cid" }> & { cid: string }, InferCreationAttributes<PinsClass>> {
	declare cid: CID
	declare group?: string
	declare path?: string
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

		group: {
			type: DataTypes.STRING,
			allowNull: true
		},

		path: {
			type: DataTypes.STRING,
			allowNull: true
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
	},

	{
		validate: {
			pathOrGroup() {
				if (this.path === null && this.group === null) {
					throw new Error("both 'group' and 'path' cannot both be null");
				}
			}
		}
	}
);
