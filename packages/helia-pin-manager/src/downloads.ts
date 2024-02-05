import { CID } from 'multiformats/cid'
import { DataTypes, Model, type Sequelize, type InferAttributes, type InferCreationAttributes, type ModelCtor } from 'sequelize'

/**
 * This class is for keeping track of blocks that need to be downloaded.
 */

export class DownloadModel extends Model<InferAttributes<DownloadModel, { omit: 'cid' | 'pinnedBy' }> & { cid: string, pinnedBy: string }, InferCreationAttributes<DownloadModel>> {
  declare cid: CID // Primary
  declare pinnedBy: CID // Primary
  declare depth: number
}

export type Downloads = ModelCtor<DownloadModel>

export const setupDownloads = (sequelize: Sequelize): Downloads => {
  return sequelize.define<DownloadModel>(
    'downloads',
    {
      cid: {
        type: DataTypes.STRING(undefined, true),
        allowNull: false,
        primaryKey: true,

        get () {
          const str = this.getDataValue('cid')

          return CID.parse(str)
        },

        set (value: CID) {
          this.setDataValue('cid', value.toString())
        }
      },

      pinnedBy: {
        type: DataTypes.STRING(undefined, true),
        allowNull: false,
        primaryKey: true,

        get () {
          const str = this.getDataValue('pinnedBy')

          return CID.parse(str)
        },

        set (value: CID) {
          this.setDataValue('pinnedBy', value.toString())
        }
      },

      depth: {
        type: DataTypes.INTEGER(),
        allowNull: false
      }
    }
  )
}
