import ObsCoordinator, { ObsCoordinatorOptions } from './obs-coordinator';

export default class WindowHerder extends ObsCoordinator {
  constructor(options: ObsCoordinatorOptions) {
    super(options);

    this.commands.set('info', (index: any, value: any) =>
      this.showInfo(index, value)
    );
    this.commands.set('i', (index: any, value: any) =>
      this.showInfo(index, value)
    );
    this.commands.set('x', (index: any, value: any) =>
      this.setXCoord(index, value)
    );
    this.commands.set('y', (index: any, value: any) =>
      this.setYCoord(index, value)
    );
    this.commands.set('w', (index: any, value: any) =>
      this.setWidth(index, value)
    );
    this.commands.set('h', (index: any, value: any) =>
      this.setHeight(index, value)
    );
  }

  herd(cmd: string, str: string) {
    const split = cmd.split(/\D+/); // Grab the index on the end of the command
    if (split.length > 1) {
      this.command(parseInt(split[1]), str);
    }

    if (this.changed) {
      this.changed = false;
      this.obsView.updateOBS();
    }
  }

  setXCoord(index: any, value: string | undefined) {
    if (!value) return;
    const current = this.obsView.getWindowX(index);
    if (value !== current) {
      this.changed = true;
      this.obsView.setWindowX(index, parseInt(value));
    }
  }

  setYCoord(index: any, value: string | undefined) {
    if (!value) return;
    const current = this.obsView.getWindowY(index);
    if (value !== current) {
      this.changed = true;
      this.obsView.setWindowY(index, parseInt(value));
    }
  }

  setWidth(index: any, value: string | undefined) {
    if (!value) return;
    const current = this.obsView.getWindowWidth(index);
    if (value !== current) {
      this.changed = true;
      this.obsView.setWindowWidth(index, parseInt(value));
    }
  }

  setHeight(index: any, value: string | undefined) {
    if (!value) return;
    const current = this.obsView.getWindowHeight(index);
    if (value !== current) {
      this.changed = true;
      this.obsView.setWindowHeight(index, parseInt(value));
    }
  }
}
