import { client, Options, ChatUserstate } from 'tmi.js';
import OBSWebSocket from 'obs-websocket-js';
import PanZoomTilt from './PanZoomTilt';
import ObsView from './ObsView';

export type Config = {
  obs: {
    address: string;
    password: string;
  };
  tmi: Options;
  PTZ?: {
    cameras: {
      label: string;
      hostname: string;
      username: string;
      password: string;
      version: number;
    }[];
  };
  views: { name: string }[];
  twitch_channel: string;
  action: () => void;
};
export async function twitchObsManager(config: Config) {
  // Initiating and connnecting OBS websocket
  const userList: { username: string; date: Date }[] = [];
  const obs: OBSWebSocket = await new OBSWebSocket();
  obs.connect({
    address: config.obs.address,
    password: config.obs.password,
  });

  // initialize OBS view
  const obs_view = new ObsView(obs);
  // initialize twitch IRC
  const chat = new client(config.tmi);
  // add views to OBS View
  config.views.map((e) => obs_view.addView(e.name));

  // assign chat functions
  chat.on('chat', onChatHandler);
  chat.on('connected', onConnectedHandler);
  chat.on('disconnected', onDisconnectedHandler);
  chat.connect();

  // functions to handle
  // chat - passes message to bot
  // connected - prints connected
  // disconnected - prints disconnected

  function onChatHandler(
    channel: string,
    userstate: ChatUserstate,
    message: string
  ) {
    if (userstate['display-name'] == 'HerdBoss') return; // ignore the bot
    chatBot(message, userstate);
  }

  // Called every time the bot connects to Twitch chat:
  function onConnectedHandler(addr: string, port: string | number) {
    console.log(`* Connected to ${addr}:${port}`);
  }
  // Called every time the bot disconnects from Twitch:
  function onDisconnectedHandler(reason: string) {
    console.log(`Disconnected: ${reason}`);
    process.exit(1);
  }

  /**
   *
   * functions to handle library concerns of PTZ and handling dispatching config command
   *
   *
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

  // handle PTZ command, parse arguments, call appropriate functions
  // function handlePtzCommand(cmd: string, rest: string[]) {
  //   controlledCameras[rest.at(0)].command(str);
  //   return;
  // }
  // Finally update userbase and call passed config action
  function handleFeedCommand(cmd: string, rest: string[]) {
    // set Window 0 to the camera labeled 'three'
    obs_view.setWindow(0, 'cam3');
    // call action set in config
    config.action();
  }
  /**
   *
   * Database of users for day. Should reset every 24 hours, otherwise stores dates with username and compares to the beginning of current day
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

  // functions to record and find username, can be modified to a database if necessary
  function findUser(
    username: string
  ): false | { username: string; date: Date } {
    let found: false | { username: string; date: Date } = false;
    const length = userList.length;
    for (let i = 0; i < length; i++) {
      if (userList[i].username === username) {
        found = userList[i];
      }
    }
    return found;
  }
  function addUser(username: string, time: Date) {
    userList.push({ username, date: time });
  }

  function updateUser(username: string, date: Date) {
    const user = findUser(username);
    if (!user) {
      return;
    }
    userList[userList.indexOf({ username, date })] = {
      username,
      date: new Date(),
    };
  }
  /**
   *
   * Chat bot functions
   *
   *
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

  const words_regex = /!([A-Za-z]+)/gm;
  const nums_regex = /[0-9]+/gm;
  // Chatbot called from onChatHandler
  function chatBot(str: string, context: ChatUserstate) {
    // array of words from message
    const matches = str.toLowerCase().match(words_regex);
    if (
      (context.username && !checkTimeout(context.username)) ||
      matches === null
    ) {
      return;
    }
    matches.forEach((match: string) => {
      if (context.mod) {
        // command comes from mood
        parseModCommand(match);
      } else if (context.subscriber) {
        // command comes from subsriber
        parseSubscriberCommand(str, match, matches);
      } else {
        // not a subscriber
        sayForSubs();
      }
    });
  }
  // passes raw message, command found and rest of the seperated words
  function parseSubscriberCommand(
    raw: string,
    match: string,
    matches: string[]
  ) {
    switch (match) {
      // SUBSCRIBER COMMANDS commands to control camera for subscribers
      case '!cam':
      case '!camera':
        obs_view.processChat(raw);
        return;
      case '!ptz':
        // handlePtzCommand(
        //   match,
        //   matches.splice(matches.indexOf(match), matches.length)
        // );
        console.log('NOT IMPLEMENTED');
        break;
      case '!feed':
        handleFeedCommand(
          match,
          matches.splice(matches.indexOf(match), matches.length)
        );
        break;
    }
  }
  function parseModCommand(cmd: string) {
    switch (cmd) {
      // MOD COMMANDS Mods should only be owners of farm
      case '!mute':
        obs.send('SetMute', { source: 'Audio', mute: true });
        return;
      case '!unmute':
        obs.send('SetMute', { source: 'Audio', mute: false });
        return;
      case '!stop':
        chat.say(config.twitch_channel, 'Stopping');
        obs.send('StopStreaming');
        return;
      case '!start':
        chat.say(config.twitch_channel, 'Starting');
        obs.send('StartStreaming', {});
        return;
      case '!restart':
        logRestart();
        return;
    }
  }

  // Checks if user is recorded and if their date is before or after the beginninig of today.
  function checkTimeout(username: string): boolean {
    // if (context.username && obs_view.cameraTimeout(context.username)) {
    //   return;
    // }
    const user = findUser(username);
    if (user === false) {
      // user not found
      addUser(username, new Date());
      return true;
    } else {
      const beginningOfToday = new Date(0, 0, 0, 0);
      // last stored user time is before beginnning of today
      if (user.date.getTime() < beginningOfToday.getTime()) {
        updateUser(username, user.date);
        return true;
      } else {
        // user is found but their date is after the beginning of today
        return false;
      }
    }
  }

  /**
   * Logging functions
   *
   *
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
  // log prevent non-subscribers from PTZ and feed
  function sayForSubs() {
    chat.say(config.twitch_channel, 'This command is reserved for Subscribers');
  }
  // log restart proocess
  const logRestart = () => {
    chat.say(config.twitch_channel, 'Stopping');
    obs.send('StopStreaming');
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
      chat.say(config.twitch_channel, 'Starting');
      obs.send('StartStreaming', {});
    }, 10000);
  };
}
