import {
	DataTypes,
	Model,
	InferAttributes,
	InferCreationAttributes,
	type Sequelize,
	type ModelCtor
} from "sequelize";
import { CID } from "multiformats/cid";

/**
 * This class handles remote data added to IPFS.
 */

export class RemoteContentModel extends Model<InferAttributes<RemoteContentModel, { omit: "cid" | "group" }> & { cid: string, group: string }, InferCreationAttributes<RemoteContentModel>> {
	declare cid: CID // Primary
	declare group: CID // Primary
	declare state: "BLOCKED" | "DOWNLOADED" | "DOWNLOADING" | "DESTROYED"
	declare priority: number
	declare encrypted: boolean // This can stay since it won't change unless group/cid changes.
	declare timestamp: Date // This can also stay..
}

export type RemoteContent = ModelCtor<RemoteContentModel>;

export const setupRemoteContent = (sequelize: Sequelize): RemoteContent => {
	return sequelize.define<RemoteContentModel>(
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

			priority: {
				type: DataTypes.INTEGER,
				defaultValue: 1
			},

			encrypted: {
				type: DataTypes.BOOLEAN,
				defaultValue: false
			},

			timestamp: DataTypes.DATE,

			state: {
				type: DataTypes.STRING,
				allowNull: false,
				defaultValue: "DOWNLOADING"
			}
		}
	);
};
