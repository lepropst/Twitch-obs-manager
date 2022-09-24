import ObsCoordinator, { ObsCoordinatorOptions } from './obs-coordinator';

export default class SceneHerder extends ObsCoordinator {
  constructor(options: ObsCoordinatorOptions) {
    super(options);

    this.commands.set('', (...args) => this.showScenes(...args));
    this.commands.set('info', (...args) => this.showInfo(...args));
    this.commands.set('i', (...args) => this.showInfo(...args));
  }

  herd(cmd, str) {
    this.command(cmd, str);
  }

  showScenes(name, cmd) {
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
