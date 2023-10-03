import { DataTypes, Model, InferAttributes, InferCreationAttributes } from "sequelize";
import { CID } from "multiformats/cid";
import { sequelize } from "./sequelize.js";

/**
 * This class is for keeping track of blocks that need to be downloaded.
 */

class DownloadsClass extends Model<InferAttributes<DownloadsClass, { omit: "cid" | "pinnedBy" }> & { cid: string, pinnedBy: string }, InferCreationAttributes<DownloadsClass>> {
	declare cid: CID // Primary
	declare pinnedBy: CID // Primary
	declare depth: number
}

export const Downloads = sequelize.define<DownloadsClass>(
	"downloads",
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

		depth: {
			type: DataTypes.INTEGER(),
			allowNull: false
		}
	}
);
