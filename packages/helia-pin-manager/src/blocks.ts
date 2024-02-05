import { CID } from 'multiformats/cid'
import { DataTypes, Model, type Sequelize, type InferAttributes, type InferCreationAttributes, type ModelCtor } from 'sequelize'

/**
 * This class is for keeping track of downloaded blocks.
 */

export class BlockModel extends Model<InferAttributes<BlockModel, { omit: 'cid' | 'pinnedBy' }> & { cid: string, pinnedBy: string }, InferCreationAttributes<BlockModel>> {
  declare cid: CID // Primary
  declare pinnedBy: CID // Primary
  declare size: number
  declare depth: number
}

export type Blocks = ModelCtor<BlockModel>

export const setupBlocks = (sequelize: Sequelize): Blocks => {
  return sequelize.define<BlockModel>(
    'blocks',
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

      size: {
        type: DataTypes.BIGINT(),
        allowNull: false
      },

      depth: {
        type: DataTypes.INTEGER(),
        allowNull: false
      }
    }
  )
}
