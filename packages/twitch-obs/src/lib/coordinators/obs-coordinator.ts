import { addAbortSignal } from 'stream';
import { Client } from 'tmi.js';
export type ObsCoordinatorOptions = { logger: any; twitch: any; obsView: any };
export default class ObsCoordinator {
  logger: any | Console;
  twitch: { chat: Client; channel: string };
  obsView: any;
  changed: boolean;
  commands: Map<string, any>;

  constructor(options: ObsCoordinatorOptions) {
    this.logger = options.logger || console;
    this.twitch = options.twitch;
    this.obsView = options.obsView;

    this.changed = false;
    this.commands = new Map();
  }
  showInfo(...args: any[]) {
    if (args.length > 0) {
      const [index, value = '*'] = args;
      if (this.obsView.getWindows().length > index) {
        this.twitch.chat.say(
          this.twitch.channel,
          `cam${index} x:${this.obsView.getWindowX(
            index
          )} y:${this.obsView.getWindowY(
            index
          )} w:${this.obsView.getWindowWidth(
            index
          )} h:${this.obsView.getWindowHeight(index)}`
        );
      }
    }
  }

  command(name: any, txt: string) {
    if (name === txt) {
      this.apply(name, '');
      return;
    }

    const words = txt
      .trim()
      .toLowerCase()
      .replace(/[!]+[\S]+[\s]+/, '') // remove the !cam at the beginning
      .replace(/[a-z]+[\s]+[\d]+/g, (s) => {
        return s.replace(/[\s]+/, '');
      }) // replace something like '1 treat' with '1treat'
      .replace(/[a-z][\s]+[+:-]/g, (s) => {
        return s.replace(/[\s]+/g, '');
      }) // remove spaces before a colon
      .replace(/[a-z][+:-][\s]+/g, (s) => {
        return s.replace(/[\s]+/g, '');
      }) // remove spaces after a colon
      .split(/[\s]+/); // split on whitespace

    words.forEach((cmd) => {
      this.apply(name, cmd);
    });
  }

  apply(name: string, cmd: string) {
    if (this.commands.has(cmd)) {
      this.commands.get(cmd)(name);
    } else {
      const [command, value] = cmd.split(/[:]+/);

      // take action if split command cmd1:val1 is found.
      if (this.commands.has(command)) this.commands.get(command)(name, value);
      // default action to take
      else if (this.commands.has('')) this.commands.get('')(name, cmd);
    }
  }
}
