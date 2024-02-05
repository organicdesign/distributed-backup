import type { Components } from '../../interface.js'

export const name = 'query-pins'

export const method = ({ pinManager }: Components) => async () => {
  throw new Error('not implemented')
  /*
    const data = await pinManager.all();

    return data;
  */
}
