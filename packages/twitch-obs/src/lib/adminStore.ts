class AdminStore {
  constructor(options: { db: any; logger: any }) {
    this.logger = options.logger || console;
    this.db = options.db || new Stojo({ logger: this.logger });
  }

  get key() {
    return 'admins';
  }

  get admins() {
    return this.db
      .fetch(this.key)
      .then((admins) => {
        if (admins)
          this.logger.debug(
            `loaded the stored admins: ${JSON.stringify(admins)}`
          );
        return new Set(admins);
      })
      .catch((err) => this.logger.warn(`loading the admins: ${err}`));
  }

  set admins(admins) {
    const a = Array.from(admins);
    this.logger.debug(`store the admins: ${JSON.stringify(a)}`);
    this.db
      .store(this.key, a)
      .catch((err) => this.logger.warn(`storing the admins: ${err}`));
  }
}
