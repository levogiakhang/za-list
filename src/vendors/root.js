import freeGlobal from './freeGlobal.js'

/** Used as a reference to the global object. */
const root = freeGlobal || Function('return this')();

export default root