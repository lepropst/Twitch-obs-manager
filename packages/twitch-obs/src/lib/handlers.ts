import { Client } from 'tmi.js';
import BlackList from './utilities/blacklist';

export function onCheerHandler(
  obsView: any,
  target: string,
  context: any,
  msg: string
) {
  console.debug(
    `Cheer: ${JSON.stringify(
      { target: target, msg: msg, context: context },
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
  obsView.processChat(msg);
}

export function onChatHandler(context: any, msg: string, target?: string) {
  try {
    if (BlackList(context['display-name']) || context.isModerator) {
      return;
    } // ignore the bots

    chatBot(context, msg); // Process chat commands
  } catch (e) {
    logger.error(
      `Error processing chat: ${JSON.stringify(e)}, context: ${JSON.stringify(
        context
      )}`
    );
  }
}
// Called every time the bot connects to Twitch chat:
export function onConnectedHandler(addr: string, port: string) {
  console.log(`== connected to twitch server: ${addr}:${port}`);
}

// Called every time the bot disconnects from Twitch:
// TODO: reconnect rather than exit
export function onDisconnectedHandler(reason: any) {
  console.info(`== disconnected from twitch: ${reason || 'unknown reason'}`);
}
