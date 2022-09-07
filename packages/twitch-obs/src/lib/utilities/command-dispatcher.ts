export default class Herder {
  constructor(options) {
    this.logger = options.logger || console;
    this.twitch = options.twitch;
    this.obsView = options.obsView;

    this.changed = false;
    this.commands = new Map();
  }

  command(name, txt) {
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

  apply(name, cmd) {
    if (this.commands.has(cmd)) {
      this.commands.get(cmd)(name);
    } else {
      const [command, value] = cmd.split(/[:]+/);
      if (this.commands.has(command)) this.commands.get(command)(name, value);
      else if (this.commands.has('')) this.commands.get('')(name, cmd);
    }
  }
}
