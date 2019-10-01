import GConfig from './GConfig';

export default class GLog {
  static logInfo(moduleName, title, ...args) {
    if (!GConfig.isOffLog && GConfig.isDev && moduleName && moduleName.constructor && typeof moduleName !== 'string') {
      console.info(`[${moduleName.constructor.name}]`, `- ${title}: `, ...args);
    }
    else if (!GConfig.isOffLog && GConfig.isDev) {
      console.info('[' + moduleName + ']', `- ${title}: `, ...args);
    }
  }
}