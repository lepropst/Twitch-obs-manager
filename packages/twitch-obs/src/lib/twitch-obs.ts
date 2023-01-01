import tmi, { ChatUserstate, Client, Options, Userstate } from 'tmi.js';
import OBSWebSocket from 'obs-websocket-js';
import sqlite3 from 'sqlite3';
// import OBSView from './obs-view.js'
// import PTZ from './ptz.js'
import { triggerRestart } from '../autostart';

import attachProcessEvents from './attachProcessEvents';
import { Config } from './types';
import { openDb } from './sqlite-db';
import { attachObsEvents } from './attachObsEvents';
import initializeCamera from './initializeCamera';
import BlackList from './utilities/blacklist';
import WindowHerder from './coordinators/window-coordinator';
import SceneHerder from './coordinators/scene-coordinator';
import ObsView from 'packages/twitch-obs/src/lib/obs-view';

export async function twitchObs(config: Config) {
  const logger = config.logger || console;
  // list of camera names
  let names = [];
  let chat: Client;
  // #TODO update
  let obsView: any;
  let obs: OBSWebSocket;
  // number of OBS connection retries
  let obs_retries = 0;
  // OBS Windows
  const windows = {
    sourceKinds: config.windows.sourceKinds || ['dshow_input', 'ffmpeg_source'],
  };
  // Twitch stream options
  const stream: any = {};
  let admins: string[] = [];
  // Application state
  let exited = false;
  try {
    const shutdown = [shutdownFunction];
    // Connect to twitch
    chat = new tmi.Client(config.tmi);
    shutdown.push(async () => {
      logger.info('== Shutting down twitch...');
      await chat.disconnect();
    });
    // Setup general application behavior and logging
    await import('../../package.json')
      .then((pkg) => {
        logger.log(`== starting ${pkg.default.name}@${pkg.default.version}`);
      })
      .catch((e) => {
        logger.error(`Unable to open package information: ${e}`);
      });
    logger.log(
      `== log levels: { console: ${logger.getLogLevel(
        logger.level.console
      )}, slack: ${logger.getLogLevel(logger.level.slack)} }`
    );

    attachProcessEvents(logger, shutdownFunction);

    // Open and initialize the sqlite database for storing object states across restarts
    const db = await openDb({
      logger: logger,
      config: {
        ...config.sqlite_options,
        filename: config.sqlite_options.filename || 'tmp/admins.db',
        driver: sqlite3.Database,
      },
    });
    shutdown.push(async () => {
      logger.info('== Shutting down the local database...');
      db.close();
    });
    const adminStore = new AdminStore({ logger: logger, db: db });
    admins = await adminStore.admins; // load from store first

    // Connect to OBS
    obs = new OBSWebSocket();
    shutdown.push(async () => {
      logger.info('== Shutting down OBS...');
      obs.disconnect();
    });
    const obsView = new ObsView({ obs: obs, db: db });

    if (admins.length === 0) {
      // if nothing in the store, load from the app config
      config.admins.forEach((admin) => admins.push(admin));
      adminStore.admins = admins; // persist any admins from the config
    }

    // User type functions

    attachObsEvents(obs, obsView, logger, reconnectOBS);

    // Connect to OBS
    connectOBS(obs).catch((e) =>
      logger.error(`Connect OBS failed: ${e.error}`)
    );

    chat.on('cheer', onCheerHandler);
    chat.on('chat', onChatHandler);
    chat.on('connected', onConnectedHandler);
    chat.on('disconnected', onDisconnectedHandler);
    chat.on('reconnect', () => {
      logger.info('== reconnecting to twitch');
    });

    // Load any non-PTZ network cameras
    names = initializeCamera(config.cams.cameras, 'static', {});

    // #TODO
    // Load the PTZ cameras
    // await initCams(app.ptz.cams, app.ptz.names, process.env.PTZ_CONFIG, 'cams', {
    //   chat: chat,
    //   channel: config.twitch_channel,
    //   logger: logger,
    //   db: db,
    // })
    //   .then(() => logger.info('== loaded PTZ cameras'))
    //   .catch((err) => logger.error(`== error loading PTZ cameras: ${err}`));
    // Connect to Twitch
    logger.info(`== connecting to twitch: ${config.twitch_channel}`);

    chat
      .connect()
      .then(() =>
        logger.info(`== connected to twitch channel: ${config.twitch_channel}`)
      )
      .catch((err) =>
        logger.error(
          `Unable to connect to twitch: ${JSON.stringify(err, null, 2)}`
        )
      );
    async function shutdownFunction() {
      if (!exited) {
        // only call this once
        exited = true;
        await Promise.all(
          shutdown.map(async (f) => {
            try {
              await f();
            } catch {
              logger.error('Error shutting something down!');
            }
          })
        );
        setTimeout(() => process.exit(1), 0); // push it back on the event loop
      }
    }
    function isSubscriber(context: any) {
      return context.subscriber || isModerator(context);
    }

    function isModerator(context: any) {
      return (
        context.mod ||
        admins.includes(context.username.toLowerCase()) ||
        isBroadcaster(context)
      );
    }

    function isBroadcaster(context: any) {
      return context.badges && context.badges.broadcaster;
    }

    async function connectOBS(obs: OBSWebSocket) {
      logger.info(`== connecting to OBS host:${config.obs.url}`);
      return obs
        .connect({
          address: config.obs.url,
          password: config.obs.password,
        })
        .then(() => {
          obs_retries = 0; // Reset for the next disconnect
          logger.info('== connected to OBS');
        })
        .then(() => obsView.syncFromObs());
    }

    function reconnectOBS() {
      // If the connection closes, retry after the timeout period
      if (!exited) {
        const delay = Math.round(3000 * 1.2 ** obs_retries++);
        logger.info(
          `OBS reconnect delay: ${
            delay / 1000
          } seconds, retries: ${obs_retries}`
        );
        setTimeout(() => {
          connectOBS(obs)
            .then(() => obs.send('GetVideoInfo'))
            .then((info) => {
              // Need the info to get the stream resolution
              stream.info = info;
              logger.info(
                `Stream Base Resolution: ${stream.info.baseWidth}x${stream.info.baseHeight}, Output Resolution: ${stream.info.outputWidth}x${stream.info.outputHeight}`
              );
              logger.debug(`Video Info: ${JSON.stringify(info, null, 2)}`);
            })
            .catch((e) => logger.error(`Connect OBS retry failed: ${e.error}`));
        }, delay);
      }
    }
    function sayForSubs(message?: string) {
      chat.say(
        config.twitch_channel,
        message || 'This command is reserved for subscribers'
      );
    }
    function sayForMods(message: string) {
      chat.say(
        config.twitch_channel,
        message || 'This command is reserved for moderators'
      );
    }

    function onCheerHandler(
      channel: string,
      userstate: ChatUserstate,
      message: string
    ): void {
      console.debug(
        `Cheer: ${JSON.stringify(
          {
            channel,
            userstate,
            message,
          },
          null,
          2
        )}`
      );

      // Automatically show the 'treat' camera at the 'cheer' shortcut if it's not already shown
      if (!obsView.inView('treat')) {
        obsView.processChat('1treat');
      }
      //   if (app.ptz.cams.has('treat'))
      //     app.ptz.cams.get('treat').moveToShortcut('cheer');

      // Process this last to ensure the auto-treat doesn't override a cheer command
      obsView.processChat(message);
    }

    function onChatHandler(
      channel: string,
      userstate: ChatUserstate,
      message: string
    ) {
      try {
        if (BlackList(userstate['display-name']) || userstate.mod) {
          console.log(`bot messaged ${message}`);
        } // ignore the bots
        else {
          chatBot(userstate, message);
        } // Process chat commands
      } catch (e) {
        logger.error(
          `Error processing chat: ${JSON.stringify(
            e
          )}, context: ${JSON.stringify(userstate)}`
        );
      }
    }
    const options = {
      logger: logger,
      twitch: {
        chat: chat,
        channel: config.twitch_channel,
      },
      obsView: obsView,
    };
    const commandProcessor = {
      windowHerder: new WindowHerder(options),
      sceneHerder: new SceneHerder(options),
    };
    // Called every time the bot connects to Twitch chat:
    function onConnectedHandler(addr: string, port: number) {
      console.log(`== connected to twitch server: ${addr}:${port}`);
    }

    // Called every time the bot disconnects from Twitch:
    // TODO: reconnect rather than exit
    function onDisconnectedHandler(reason: any) {
      console.info(
        `== disconnected from twitch: ${reason || 'unknown reason'}`
      );
    }

    function chatBot(context: Userstate, str: string) {
      // Only process the command if the message starts with a '!'
      if (!str.trim().startsWith('!')) return;

      logger.info(`Command from ${context.username}: ${str}`);
      logger.debug(
        `Chat message:\nmessage: ${str}\nuser: ${JSON.stringify(
          context,
          null,
          2
        )}`
      );

      const matches = str
        .trim()
        .toLowerCase()
        .match(/!(\w+)\b/gm);
      if (matches == null || obsView.cameraTimeout(context.username)) return;

      matches.forEach((match) => {
        switch (match) {
          // ANYONE COMMANDS
          case '!cams': {
            const sources = obsView
              .getSources(config.windows.sourceKinds)
              .map((s: string) =>
                config.cams.names.includes(s)
                  ? `${s.replace(/\W/g, '-')} (ptz)`
                  : s.replace(/\W/g, '-')
              );
            // Put PTZ cams first, then sort alphabetically
            sources.sort((a: any, b: any) => {
              if (a.includes('ptz') && !b.includes('ptz')) return -1;
              else if (!a.includes('ptz') && b.includes('ptz')) return 1;
              else if (a === b) return 0;
              else return a < b ? -1 : 1;
            });
            if (sources.length > 0)
              chat.say(
                config.twitch_channel,
                `Available cams: ${sources.join(', ')}`
              );
            else chat.say(config.twitch_channel, 'No cams currently available');
            break;
          }
          // case '!ptz':
          //   if (app.ptz.names.length > 0)
          //     chat.say(
          //       config.twitch_channel,
          //       `PTZ cams: ${app.ptz.names.join(', ')}`
          //     );
          //   else chat.say(config.twitch_channel, 'No PTZ cams configured');
          //   break;

          // SUBSCRIBER COMMANDS
          case '!cam':
          case '!camera':
            if (isSubscriber(context)) obsView.processChat(str);
            else sayForSubs();

            break;
          case '!bell':
            if (!isSubscriber(context)) break;
            logger.info(`${context.username} rang the bell`);

            // Automatically show the 'does' camera at the 'bell' shortcut if it's not already shown
            if (!obsView.inView('does'))
              obsView.processChat(config.defaultCamera);
            // if (app.ptz.cams.has('does'))
            //   app.ptz.cams.get('does').moveToShortcut('bell');
            break;
          case '!scene':
          case '!scenes':
            if (isSubscriber(context))
              commandProcessor.sceneHerder.herd([match, str]);
            else sayForSubs();
            break;
          // MOD COMMANDS
          case '!windows':
            if (isModerator(context))
              obsView.commandWindows(chat, config.twitch_channel, str);
            break;
          case '!sync':
            if (isModerator(context)) obsView.syncFromObs();
            break;
          case '!log':
            if (isModerator(context)) {
              const words = str
                .trim()
                .replace(/[a-z][\s]+[+:-]/g, (s) => {
                  return s.replace(/[\s]+/g, '');
                }) // remove spaces before a colon
                .replace(/[a-z][+:-][\s]+/g, (s) => {
                  return s.replace(/[\s]+/g, '');
                }) // remove spaces after a colon
                .split(/[\s]+/); // split on whitespace

              words.forEach((word) => {
                if (word.search(':') > 0) {
                  const [dest, level] = word.split(/[:]/);
                  logger.updateLog(dest, level);
                }
              });
            }
            break;
          case '!admin':
            if (isModerator(context)) {
              const words = str
                .trim()
                .toLowerCase()
                .replace(/[a-z]+[\s]+[\d]+/g, (s) => {
                  return s.replace(/[\s]+/, '');
                }) // replace something like '1 treat' with '1treat'
                .replace(/[a-z][\s]+[+:-]/g, (s) => {
                  return s.replace(/[\s]+/g, '');
                }) // remove spaces before a colon
                .replace(/[a-z][+:-][\s]+/g, (s) => {
                  return s.replace(/[\s]+/g, '');
                }) // remove spaces after a colon
                .replace(/[!]+[\S]+[\s]+/, '') // remove the !cam at the beginning
                .split(/[\s]+/); // split on whitespace

              words.forEach((cmd) => {
                if (cmd.search(/[a-z]+:[\S]+/) >= 0) {
                  const [command, value] = cmd.split(/[:]+/);
                  switch (command) {
                    case 'add':
                      logger.info(`Adding admin '${value}'`);
                      admins.push(value);
                      break;
                    case 'delete':
                    case 'remove':
                      logger.info(`Removing admin '${value}'`);
                      delete admins[admins.indexOf(value)];
                      break;
                  }
                  adminStore.admins = admins;
                }
              });
            }
            break;
          case '!mute':
            if (isModerator(context)) {
              obs
                .send('SetMute', { source: 'Audio', mute: true })
                .then(() => chat.say(config.twitch_channel, 'Stream muted'))
                .catch((e) => {
                  logger.error(`Unable to mute: ${JSON.stringify(e, null, 2)}`);
                  chat.say(config.twitch_channel, 'Unable to mute the stream!');
                });
            }
            break;
          case '!unmute':
            if (isModerator(context)) {
              obs
                .send('SetMute', { source: 'Audio', mute: false })
                .then(() => chat.say(config.twitch_channel, 'Stream unmuted'))
                .catch((e) => {
                  logger.error(
                    `Unable to unmute: ${JSON.stringify(e, null, 2)}`
                  );
                  chat.say(
                    config.twitch_channel,
                    'Unable to unmute the stream!'
                  );
                });
            }
            break;
          case '!restartscript':
            if (isModerator(context)) {
              triggerRestart(process.env['RESTART_FILE'])
                .then(() =>
                  logger.info(
                    `Triggered restart and wrote file '${process.env['RESTART_FILE']}'`
                  )
                )
                .catch((e) =>
                  logger.error(
                    `Unable to write the restart file '${process.env['RESTART_FILE']}': ${e}`
                  )
                );
            }
            break;
          case '!stop':
            if (isModerator(context)) {
              obs
                .send('StopStreaming')
                .then(() => chat.say(config.twitch_channel, 'Stream stopped'))
                .catch((e) => {
                  logger.error(
                    `Unable to stop OBS: ${JSON.stringify(e, null, 2)}`
                  );
                  chat.say(
                    config.twitch_channel,
                    'Something went wrong... unable to stop the stream'
                  );
                });
            }
            break;
          case '!start':
            if (isModerator(context)) {
              obs
                .send('StartStreaming', args_0:{})
                .then(() => chat.say(config.twitch_channel, 'Stream started'))
                .catch((e) => {
                  logger.error(
                    `Unable to start OBS: ${JSON.stringify(e, null, 2)}`
                  );
                  chat.say(
                    config.twitch_channel,
                    'Something went wrong... unable to start the stream'
                  );
                });
            }
            break;
          case '!restart':
            if (isModerator(context)) {
              obs
                .send('StopStreaming')
                .then(() => {
                  chat.say(
                    config.twitch_channel,
                    'Stream stopped. Starting in...'
                  );
                  setTimeout(function () {
                    chat.say(config.twitch_channel, ':Z Five');
                  }, 5000);
                  setTimeout(function () {
                    chat.say(config.twitch_channel, ':\\ Four');
                  }, 6000);
                  setTimeout(function () {
                    chat.say(config.twitch_channel, ';p Three');
                  }, 7000);
                  setTimeout(function () {
                    chat.say(config.twitch_channel, ':) Two');
                  }, 8000);
                  setTimeout(function () {
                    chat.say(config.twitch_channel, ':D One');
                  }, 9000);
                  setTimeout(function () {
                    obs
                      .send('StartStreaming')
                      .then(() =>
                        chat.say(config.twitch_channel, 'Stream restarted')
                      )
                      .catch((e) => {
                        logger.error(
                          `Unable to start OBS after a restart: ${JSON.stringify(
                            e,
                            null,
                            2
                          )}`
                        );
                        chat.say(
                          config.twitch_channel,
                          'Something went wrong... unable to restart the stream'
                        );
                      });
                  }, 10000);
                })
                .catch((e) => {
                  logger.error(
                    `Unable to stop OBS for a restart: ${JSON.stringify(
                      e,
                      null,
                      2
                    )}`
                  );
                  chat.say(
                    config.twitch_channel,
                    "Something went wrong... the stream won't stop."
                  );
                });
            }
            break;
          default: {
            const cam = match.replace(/^[!]+/, '');
            const sub = isSubscriber(context);
            const mod = isModerator(context);
            let saySubsOnly = false;

            // A command for a PTZ camera
            if (app.ptz.cams.has(cam)) {
              if (str.includes(' reboot') && !mod) {
                sayForMods('The reboot command is reserved for moderators');
              } else if (sub) app.ptz.cams.get(cam).command(str);
              else saySubsOnly = true;
            }
            // A command for a non-PTZ camera
            if (app.ipcams.cams.has(cam)) {
              if (str.includes(' reboot') && !mod) {
                sayForMods('The reboot command is reserved for moderators');
              } else if (sub) app.ipcams.cams.get(cam).command(str);
              else saySubsOnly = true;
            }
            // A command to modify an OBS source cam
            if (obsView.hasSourceAlias(cam)) {
              if (sub) obsView.command(chat, config.twitch_channel, cam, str);
              else saySubsOnly = true;
            }
            // A command for a window
            if (match.startsWith('!cam')) {
              if (sub) app.windowHerder.herd(match, str);
              else saySubsOnly = true;
            }

            if (saySubsOnly) sayForSubs();
          }
        }
      });
    }
    // application main subroutine
  } catch (e) {
    console.error(`app error ${e}`);
  }
}
