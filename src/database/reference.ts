import { DataTypes, Model, InferAttributes, InferCreationAttributes } from "sequelize";
import { CID } from "multiformats/cid";
import { toString as uint8ArrayToString, fromString as uint8ArrayFromString } from "uint8arrays";
import { Upload } from "./upload.js";
import { sequelize } from "./sequelize.js";
import type { Link } from "../interface.js";

class ReferenceClass extends Model<InferAttributes<ReferenceClass, { omit: "cid" | "group" | "author" | "links" | "meta" }> & { cid: string, group: string, author: string, links: string, meta?: string }, InferCreationAttributes<ReferenceClass>> {
	declare cid: CID
	declare group: CID
	declare author: Uint8Array
	declare encrypted: boolean
	declare timestamp: Date
	declare links: Link[]
	declare meta?: Record<string, unknown>
	declare blocked: boolean
	declare downloaded: number

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

		author: {
			type: DataTypes.STRING(undefined, true),

			get () {
				const str = this.getDataValue("author");

				return uint8ArrayFromString(str);
			},

			set (value: Uint8Array) {
				this.setDataValue("author", uint8ArrayToString(value));
			}
		},

		encrypted: {
			type: DataTypes.BOOLEAN,
			defaultValue: false
		},

		timestamp: DataTypes.DATE,

		links: {
			type: DataTypes.STRING(undefined, true),
			allowNull: false,
			defaultValue: JSON.stringify([]),

			get (): Link[] {
				const str = this.getDataValue("links");
				const arr: { cid: string, type: string }[] = JSON.parse(str);

				return arr.map(i => ({
					...i,
					cid: CID.parse(i.cid)
				}));
			},

			set (values: Link[]) {
				this.setDataValue("links", JSON.stringify(values.map(v => ({
					...v,
					cid: v.cid.toString()
				}))));
			}
		},

		meta: {
			type: DataTypes.STRING,
			allowNull: true,

			get () {
				const str = this.getDataValue("meta");

				if (str == null) {
					return undefined;
				}

				return JSON.parse(str);
			},

			set (value: Record<string, undefined>) {
				this.setDataValue("meta", JSON.stringify(value));
			}
		},

		blocked: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false
		},

		downloaded: {
			type: DataTypes.NUMBER,
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
