export default function attachProcessEvents(logger: any, shutdown: () => void) {
  process.on('SIGTERM', () => {
    console.log('\nSIGTERM received.');
    shutdown();
  });
  process.on('SIGINT', () => {
    console.log('\nSIGINT received.');
    shutdown();
  });
  process.on('SIGBREAK', () => {
    console.log('\nSIGBREAK received.');
    shutdown();
  });
  process.on('SIGHUP', () => {
    console.log('\nSIGHUP received.');
    shutdown();
  });
  process.on('uncaughtException', (err, origin) => {
    logger.error(`${origin}: ${err}`);
  });
  process.on('unhandledRejection', (reason, promise) => {
    logger.warn(
      `Venice broke her promise to Jerry...\nPromise: ${promise.constructor.valueOf()}\nReason: ${JSON.stringify(
        reason,
        null,
        2
      )}`
    );
  });
  process.on('exit', (code) => {
    logger.log(`== exiting with code: ${code}`);
  });
}
