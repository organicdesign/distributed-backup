import { DataTypes, Model, InferAttributes, InferCreationAttributes } from "sequelize";
import { CID } from "multiformats/cid";
import { Upload } from "./upload.js";
import { sequelize } from "./sequelize.js";

class ReferenceClass extends Model<InferAttributes<ReferenceClass, { omit: "cid" | "group" }> & { cid: string, group: string }, InferCreationAttributes<ReferenceClass>> {
	declare cid: CID
	declare group: CID
	declare encrypted: boolean // This can stay since it won't change if group/cid changes.
	declare timestamp: Date // This can also stay.
	declare blocked: boolean // This is local data so it must stay.
	declare discoveredBlocks: number // The number of blocks this DAG has been discovered to have.
	declare discoveredSize: number // The accumulative size of all the blocks this DAG has been discovered to be.
	declare downloadedBlocks: number // The number of blocks that have been downloaded to disk.
	declare downloadedSize: number // The accumulative size of all the blocks on disk for this DAG.

	// This is a flag to say if it has been pinned yet or not.
	declare pinned: boolean

	// This is a flag to say if it has been destoyed, pending unpinning.
	declare destroyed: boolean
}

export const Reference = sequelize.define<ReferenceClass>(
	"reference",
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

		discoveredBlocks: {
			type: DataTypes.INTEGER,
			allowNull: false,
			defaultValue: 0
		},

		discoveredSize: {
			type: DataTypes.INTEGER,
			allowNull: false,
			defaultValue: 0
		},

		downloadedBlocks: {
			type: DataTypes.INTEGER,
			allowNull: false,
			defaultValue: 0
		},

		downloadedSize: {
			type: DataTypes.INTEGER,
			allowNull: false,
			defaultValue: 0
		},

		pinned: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false
		},

		destroyed: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false
		}
	},
	{
		hooks: {
			async afterDestroy (reference) {
				const upload = await Upload.findOne({
					where: {
						cid: reference.dataValues.cid,
						group: reference.dataValues.group
					}
				});

				if (upload == null) {
					return;
				}

				await upload.destroy();
			}
		}
	}
);
