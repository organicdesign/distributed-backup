import { DataTypes, Model, InferAttributes, InferCreationAttributes } from "sequelize";
import { CID } from "multiformats/cid";
import { sequelize } from "./sequelize.js";

class BlocksClass extends Model<InferAttributes<BlocksClass, { omit: "cid" | "pinnedBy" }> & { cid: string, pinnedBy: string }, InferCreationAttributes<BlocksClass>> {
	declare cid: CID
	declare pinnedBy: CID
	declare size: number
	declare depth: number
}

export const Blocks = sequelize.define<BlocksClass>(
	"blocks",
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

		pinnedBy: {
			type: DataTypes.STRING(undefined, true),
			allowNull: false,
			primaryKey: true,

			get () {
				const str = this.getDataValue("pinnedBy");

				return CID.parse(str);
			},

			set (value: CID) {
				this.setDataValue("pinnedBy", value.toString());
			}
		},

		size: {
			type: DataTypes.BIGINT(),
			allowNull: false
		},

		depth: {
			type: DataTypes.INTEGER(),
			allowNull: false
		}
	}
);
