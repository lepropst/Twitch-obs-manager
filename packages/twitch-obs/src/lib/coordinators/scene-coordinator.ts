import ObsCoordinator, { ObsCoordinatorOptions } from './obs-coordinator';

export default class SceneHerder extends ObsCoordinator {
  constructor(options: ObsCoordinatorOptions) {
    super(options);

    this.commands.set('', (...args: any[]) => this.showScenes(...args));
    this.commands.set('info', (...args: any[]) => this.showInfo(...args));
    this.commands.set('i', (...args: any[]) => this.showInfo(...args));
  }

  herd(args: any[]) {
    if (args.length > 1) {
      const [cmd, str, rest] = args;
      this.command(cmd, str);
    }
  }

  showScenes(...args: any[]) {
    if (args.length > 1) {
      const [name, cmd] = args;
      // if the default command is empty then go ahead and list the scenes.
      if (!cmd || cmd.length === 0)
        this.twitch.chat.say(
          this.twitch.channel,
          `scenes: ${this.obsView.getSceneAliases().join(', ')}`
        );
      else {
        this.obsView.setCurrentScene(cmd);
      }
    }
  }
}
