const env = {
  isDev: true,
};

let isOffLog = false;

export default class GConfig {
  static offLog() {
    isOffLog = true;
  }

  static onLog() {
    isOffLog = false;
  }

  static offEnvDev() {
    env.isDev = false;
  }

  static onEnvDev() {
    env.isDev = true;
  }

  static get isDev() {
    return env.isDev;
  }

  static get env() {
    return env;
  }

  static get isOffLog() {
    return isOffLog;
  }
}