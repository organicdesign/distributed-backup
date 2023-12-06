import {
	DataTypes,
	Model,
	InferAttributes,
	InferCreationAttributes,
	type Sequelize,
	type ModelCtor
} from "sequelize";
import { CID } from "multiformats/cid";
import type { Link } from "../interface.js";

/**
 * This class handles remote data added to IPFS.
 */

export class ContentModel extends Model<InferAttributes<ContentModel, { omit: "cid" | "group" | "links" }> & { cid: string, group: string, links: string }, InferCreationAttributes<ContentModel>> {
	declare cid: CID
	declare group: CID // Primary
	declare path: string // Primary
	declare state: "COMPLETED" | "DOWNLOADING" | "UPLOADING" | "DESTROYED"
	declare encrypted: boolean
	declare timestamp: Date
	declare priority: number
	declare sequence?: number
	declare links: Link[]
}

export type Content = ModelCtor<ContentModel>;

export const setupContent = (sequelize: Sequelize): Content => {
	return sequelize.define<ContentModel>(
		"content",
		{
			cid: {
				type: DataTypes.STRING(undefined, true),
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

			path: {
				type: DataTypes.STRING,
				primaryKey: true,
				allowNull: false
			},

			priority: {
				type: DataTypes.INTEGER,
				defaultValue: 1
			},

			sequence: {
				type: DataTypes.INTEGER,
				allowNull: true
			},

			encrypted: {
				type: DataTypes.BOOLEAN,
				defaultValue: false
			},

			timestamp: DataTypes.DATE,

			state: {
				type: DataTypes.STRING,
				allowNull: false
			},

			links: {
				type: DataTypes.STRING,
				allowNull: true,

				get () {
					const str = this.getDataValue("links");

					if (str == null) {
						return [];
					}

					const arr: Link[] = JSON.parse(str);

					return arr;
				},

				set (value?: Link[]) {
					if (value == null) {
						this.setDataValue("links", "[]");
						return;
					}

					const str = JSON.stringify(value);

					this.setDataValue("links", str);
				}
			}
		}
	);
};
