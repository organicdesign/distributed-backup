import { DataTypes, Model, InferAttributes, InferCreationAttributes, Sequelize } from "sequelize";
import { CID } from "multiformats/cid";

/**
 * This class is for keeping track of raw pins.
 */

class PinsClass extends Model<InferAttributes<PinsClass, { omit: "cid" }> & { cid: string }, InferCreationAttributes<PinsClass>> {
	declare cid: CID // Primary
	declare depth?: number
	declare state: "COMPLETED" | "DOWNLOADING" | "DESTROYED"
}

export const setupPins = (sequelize: Sequelize) => {
	return sequelize.define<PinsClass>(
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
};
