import freeGlobal from './freeGlobal.js'

/** Used as a reference to the global object. */
// eslint-disable-next-line no-new-func
const root = freeGlobal || Function('return this')();

export default root