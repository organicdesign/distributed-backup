import { DataTypes, Model, InferAttributes, InferCreationAttributes } from "sequelize";
import { CID } from "multiformats/cid";
import { sequelize } from "./sequelize.js";

class PinsClass extends Model<InferAttributes<PinsClass, { omit: "cid" }> & { cid: string }, InferCreationAttributes<PinsClass>> {
	declare cid: CID
	declare blocks: number
	declare size: number
	declare diskBlocks: number
	declare diskSize: number
	declare pinned: boolean
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

		blocks: {
			type: DataTypes.BIGINT({ unsigned: true }),
			allowNull: false
		},

		size: {
			type: DataTypes.BIGINT({ unsigned: true }),
			allowNull: false
		},

		diskBlocks: {
			type: DataTypes.BIGINT({ unsigned: true }),
			allowNull: false
		},

		diskSize: {
			type: DataTypes.BIGINT({ unsigned: true }),
			allowNull: false
		},

		pinned: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false
		}
	}
);
