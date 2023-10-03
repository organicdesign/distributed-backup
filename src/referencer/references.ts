import { DataTypes, Model, InferAttributes, InferCreationAttributes } from "sequelize";
import { CID } from "multiformats/cid";
import { sequelize } from "./sequelize.js";

class ReferencesClass extends Model<InferAttributes<ReferencesClass, { omit: "cid" | "meta" }> & { cid: string, meta: string }, InferCreationAttributes<ReferencesClass>> {
	declare cid: CID
	declare reference: string
	declare type: "LOCAL" | "REMOTE"
	declare meta: Record<string, unknown>
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

		reference: {
			type: DataTypes.STRING,
			primaryKey: true,
			allowNull: false
		},

		type: {
			type: DataTypes.STRING,
			allowNull: false
		},

		meta: {
			type: DataTypes.STRING,
			allowNull: false,
			defaultValue: "{}",

			get () {
				const str = this.getDataValue("meta");

				return JSON.parse(str);
			},

			set (value: Record<string, unknown>) {
				this.setDataValue("meta", JSON.stringify(value));
			}
		}
	}
);
