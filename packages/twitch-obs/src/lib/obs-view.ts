import { Client } from 'tmi.js';
function getSourceAliases(sources: any) {
  const sourceAliases: { [key: string]: any } = {}; // Needs to be an Object, not Map, in order to persist it in the object store
  for (const sourceName in sources)
    sourceAliases[sourceName.toLowerCase().replace(/\W/g, '-')] = sourceName;
  return sourceAliases;
}
function getSceneWindows(scene: any, windowKinds: any) {
  const windows = [];
  for (const sourceName in scene.sources) {
    const source = scene.sources[sourceName];

    if (source.visible && windowKinds.includes(source.kind)) {
      // Only visible media sources are treated as windows
      windows.push({
        source: source.name,
        position: source.position,
        width: source.width,
        height: source.height,
      });
    }
  }

  return windows;
}
function getSceneCams(windows: any) {
  const cams: any[] = [];
  windows.forEach((window: any) => cams.push(window.source));
  return cams;
}
function sortWindows(a: any, b: any) {
  const fudge = process.env['CAM_FUDGE'] ? +process.env['CAM_FUDGE'] : 0.8;
  if (a.width * a.height * fudge > b.width * b.height)
    return -1; // Window 'a' is bigger
  else if (a.width * a.height < b.width * b.height * fudge)
    return 1; // Window 'b' is bigger
  else {
    // The windows are the same size, sort by distance from the origin
    const adist = Math.sqrt(((a.position.x * 9) / 16) ** 2 + a.position.y ** 2); // Make it square, then find the distance
    const bdist = Math.sqrt(((b.position.x * 9) / 16) ** 2 + b.position.y ** 2); // Make it square, then find the distance
    if (adist < bdist) return -1; // Window 'a' is closer to the origin
    else if (adist > bdist) return 1; // Window 'b' is closer to the origin
    else if (a.position.x < b.position.x)
      return -1; // Window 'a' is closer to the left
    else if (a.position.x > b.position.x)
      return 1; // Window 'b' is closer to the left
    else if (a.position.y < b.position.y)
      return -1; // Window 'a' is closer to the top
    else if (a.position.y > b.position.y) return 1; // Window 'b' is closer to the top
  }

  return 0; // The windows are the same size and position
}

class ScenesRenderer {
  obs: any;
  logger: any;
  constructor(options: any) {
    this.obs = options.obs;
    this.logger = options.logger;
  }

  async getSceneItemProperties(sceneName: string, sourceName: string) {
    const sceneItem: { [key: string]: any } = { item: sourceName };
    sceneItem['scene-name'] = sceneName;
    return this.obs.send('GetSceneItemProperties', sceneItem);
  }

  async getSceneSource(sceneName: string, sourceData: any) {
    return this.getSceneItemProperties(sceneName, sourceData.name)
      .catch((e) =>
        this.logger.error(
          `Error getting scene properties for scene: ${sceneName}, source: ${
            sourceData.name
          }: ${JSON.stringify(e)}`
        )
      )
      .then((source) => {
        source.kind = sourceData.type;
        return source;
      });
  }

  async getSceneSources(sceneData: any) {
    const sources: { [key: string]: any } = {};
    return Promise.all(
      sceneData.sources.map(async (sourceData: any) => {
        return this.getSceneSource(sceneData.name, sourceData).then(
          (source) => {
            sources[source.name] = source;
          }
        );
      })
    ).then(() => sources);
  }

  async getScene(sceneData: any) {
    const scene: {
      name: any;
      changedCams: any;
      changedWindows: any;
      sources?: any;
      sourceAliases?: any;
    } = {
      name: sceneData.name,
      changedCams: new Set(),
      changedWindows: new Set(),
    };

    return this.getSceneSources(sceneData)
      .then((sources) => {
        scene.sources = sources;
        scene.sourceAliases = getSourceAliases(sources);
      })
      .then(() => scene);
  }

  async getScenes(scenesData: any, windowKinds: any) {
    const scenes: { [key: string]: any } = {};
    return Promise.all(
      scenesData.map(async (sceneData: any) => {
        return this.getScene(sceneData).then((scene: any) => {
          scene.windows = getSceneWindows(scene, windowKinds);
          scene.windows.sort((a: any, b: any) => sortWindows(a, b)); // Sort the windows for cam0, cam1, etc.
          scene.cams = getSceneCams(scene.windows); // Depends on the order of the windows
          scene.windows.forEach((window: any) => {
            if (window.source) delete window.source;
          }); // Don't need this now that we have sorted the windows
          scenes[scene.name] = scene;
        });
      })
    ).then(() => scenes);
  }
}
export type props = {
  windowKinds?: string[];
  db: any;
  obs: any;
  logger?: any;
};
export default class OBSView {
  obs: any;
  logger: any;
  windowKinds: any;
  db: any;
  scenesRenderer: ScenesRenderer;
  scenes: { [key: string]: any };
  sceneAliases: { [key: string]: any };
  currentScene: string;
  commands: Map<any, any>;
  constructor(options: props) {
    this.obs = options.obs;
    this.logger = options.logger || console;
    this.windowKinds = options.windowKinds || ['dshow_input', 'ffmpeg_source'];

    this.db = options.db;
    this.scenesRenderer = new ScenesRenderer({
      obs: this.obs,
      logger: this.logger,
    });
    this.scenes = {};
    this.sceneAliases = {};
    this.currentScene = '';

    this.commands = new Map();
    this.commands.set('source', (...args: any[]) => {
      const [chat, channel, alias, value] = args;
      this.handleShowInfo(chat, channel, alias, value);
    });
    this.commands.set('show', (...args: any[]) => {
      const [chat, channel, alias, value] = args;
      this.handleShowSource(chat, channel, alias, value);
    });

    this.commands.set('hide', (...args: any[]) => {
      const [chat, channel, alias, value] = args;
      this.handleHideSource(chat, channel, alias, value);
    });
    this.commands.set('reset', (...args: any[]) => {
      const [chat, channel, alias, value] = args;

      this.handleResetSource(chat, channel, alias, value);
    });
  }

  getSceneAliases(scenes: any) {
    if (scenes === false) {
      return Object.keys(this.sceneAliases);
    }
    const sceneAliases: { [key: string]: any } = {}; // Needs to be an Object, not Map, in order to persist it in the object store
    for (const sceneName in scenes)
      sceneAliases[sceneName.toLowerCase().replace(/\W/g, '-')] = sceneName;
    return sceneAliases;
  }

  getWindows(scene: any) {
    if (typeof scene === 'string') {
      const sceneTmp: { [key: string]: any } =
        this.scenes[scene || this.currentScene];
      return sceneTmp ? sceneTmp['windows'] : null;
    }
    const windows: any[] = [];

    if (scene && scene.windows) {
      let i = 0;
      scene.windows.forEach((window: any) => {
        if (scene.cams && scene.cams.length > i) {
          const sourceName = scene.cams[i++];
          windows.push({
            item: sourceName,
            position: window.position,
            scale: {
              filter:
                scene.sources[sourceName].scale.filter || 'OBS_SCALE_DISABLE',
              x: window.width / scene.sources[sourceName].sourceWidth,
              y: window.height / scene.sources[sourceName].sourceHeight,
            },
            visible: true,
          });
        }
      });
    }

    return windows;
  }
  /**
  This function is used to correct windows object structure that has changed between versions of this software
  */
  fixupWindows(views: any) {
    // Nothing to fixup
    return views;
  }

  /**
  Gets the key for storing windows
  */
  get windowskey() {
    return 'obs.windows';
  }

  get storedWindows() {
    return this.db
      .fetch(this.windowskey)
      .then((views: any) => {
        if (views)
          this.logger.debug(`loaded the windows: ${JSON.stringify(views)}`);
        return this.fixupWindows(views);
      })
      .catch((err: any) =>
        this.logger.warn(`loading the camera position for ${err}`)
      );
  }

  set storedWindows(views) {
    this.logger.debug(`store the views: ${JSON.stringify(views)}`);
    this.db
      .store(this.windowskey, views)
      .catch((err: any) => this.logger.warn(`storing the views: ${err}`));
  }
  command(chat: any, channel: string, alias: string, txt: string) {
    const words = txt
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
      this.apply(chat, channel, alias, cmd);
    });
  }

  apply(chat: any, channel: string, alias: string, cmd: string) {
    if (this.commands.has(cmd)) {
      this.commands.get(cmd)(chat, channel, alias);
    } else {
      const [command, value] = cmd.split(/[:]+/);
      if (this.commands.has(command)) {
        this.commands
          .get(command)(chat, channel, alias, value)
          .catch((e: any) => {
            this.logger.error(
              `Error handling command '${command}' for alias '${alias}': ${JSON.stringify(
                e
              )}`
            );
          });
      }
    }
  }

  async handleShowInfo(
    chat: any,
    channel: string,
    alias: string,
    value: string
  ) {
    const source = this.getSourceByAlias(alias);
    if (source) {
      chat.say(
        channel,
        `${alias} source w:${source.sourceWidth} h:${source.sourceHeight}`
      );
    } else {
      this.logger.info(`No source info for '${alias}'`);
    }
  }

  async handleShowSource(
    chat: any,
    channel: string,
    alias: string,
    value: string
  ) {
    const sourceName = this.getSourceNameByAlias(alias, this.currentScene);
    return sourceName && value === 'false'
      ? this.hideSource(sourceName, this.currentScene)
      : this.showSource(sourceName, this.currentScene);
  }

  async handleHideSource(
    chat: any,
    channel: string,
    alias: string,
    value: string
  ) {
    const sourceName = this.getSourceNameByAlias(alias, this.currentScene);
    return sourceName && value === 'false'
      ? this.showSource(sourceName, this.currentScene)
      : this.hideSource(sourceName, this.currentScene);
  }

  async handleResetSource(
    chat: any,
    channel: string,
    alias: string,
    value: any
  ) {
    const source = this.getSourceByAlias(alias, this.currentScene);

    if (source.visible) {
      return this.resetSource(
        source.name,
        this.currentScene,
        value && parseInt((parseFloat(value) * 1000).toString())
      );
    }
  }

  async hideSource(sourceName: string, sceneName?: string) {
    return this.setSceneItemRender(sourceName, sceneName, false);
  }

  async showSource(sourceName: string, sceneName?: string) {
    return this.setSceneItemRender(sourceName, sceneName, true);
  }

  async resetSource(sourceName: any, sceneName: any, delay: number) {
    this.hideSource(sourceName, sceneName)
      .then(() => {
        setTimeout(
          () =>
            this.showSource(sourceName, sceneName)
              .then(() => {
                this.logger.info(
                  `Reset source '${sourceName}' in scene '${sceneName}'`
                );
              })
              .catch((e) => {
                this.logger.error(
                  `Unable to show source '${sourceName}' in scene '${sceneName}' for reset: ${JSON.stringify(
                    e
                  )}`
                );
              }),
          delay ? delay : 3000
        );
      })
      .catch((e) => {
        this.logger.error(
          `Unable to hide source '${sourceName}' in scene '${sceneName}' for reset: ${JSON.stringify(
            e
          )}`
        );
      });
  }

  async setSceneItemRender(
    sourceName: string,
    sceneName?: string,
    render = false
  ) {
    const item: { [key: string]: any } = { source: sourceName, render: render };
    item['scene-name'] = sceneName || this.currentScene;
    return this.obs.send('SetSceneItemRender', item).catch((e: any) => {
      this.logger.warn(
        `Unable to ${
          render ? 'show' : 'hide'
        } source '${sourceName}' in scene '${sceneName}': ${e.error}`
      );
    });
  }

  commandWindows(chat: Client, channel: string, message: string) {
    this.logger.debug(
      `OBS Sources: ${JSON.stringify(
        this.scenes[this.currentScene].sources,
        null,
        2
      )}`
    );
    this.logger.debug(
      `Filtered sources: ${JSON.stringify(
        this.getSources(this.windowKinds),
        null,
        2
      )}`
    );
    this.logger.debug(
      `Windows: ${JSON.stringify(
        this.scenes[this.currentScene].windows,
        null,
        2
      )}`
    );
    if (this.scenes[this.currentScene].windows.length === 0)
      chat.say(channel, 'There are currenly no windows displayed');
    else {
      const windows = [];
      for (let i = 0; i < this.scenes[this.currentScene].windows.length; i++) {
        windows.push(
          `${i}:${this.getAliasBySourceName(
            this.scenes[this.currentScene].cams[i]
          )}`
        );
      }
      chat.say(channel, `Windows: ${windows.join(', ')}`);
    }
  }

  /**
   * Gets an array of OBS sources by kind
   * @param kinds the OBS source kind
   * @returns array of source names
   */
  getSources(kinds: any) {
    const sources: any[] = [];

    if (this.currentScene && this.scenes[this.currentScene]) {
      Object.values(this.scenes[this.currentScene].sources).forEach(
        (source: any) => {
          if (!kinds || kinds.includes(source.kind)) {
            // If kinds is null, assume any kind
            sources.push(source.name.toLowerCase());
          }
        }
      );
    }

    return sources;
  }

  /**
   * Get the source object by alias name
   * @param {string} sourceAlias an alias for the source
   * @param {string} sceneName the name of the scene
   * @returns the source objevt returned from OBS
   */
  getSourceByAlias(sourceAlias: string, sceneName?: string) {
    sceneName = sceneName || this.currentScene;
    if (this.scenes[sceneName]) {
      const sourceName = this.scenes[sceneName].sourceAliases[sourceAlias];
      if (sourceName) {
        return this.scenes[sceneName].sources[sourceName];
      }
    }
  }

  getSourceByName(sourceName: string, sceneName?: string) {
    sceneName = sceneName || this.currentScene;
    if (this.scenes[sceneName]) {
      return this.scenes[sceneName].sources[sourceName];
    }
  }

  getSourceNameByAlias(sourceAlias: string, sceneName?: string) {
    sceneName = sceneName || this.currentScene;
    if (this.scenes[sceneName]) {
      return this.scenes[sceneName].sourceAliases[sourceAlias];
    }
  }

  getAliasBySourceName(sourceName: string, sceneName?: string) {
    sceneName = sceneName || this.currentScene;

    for (const alias in this.scenes[sceneName].sourceAliases) {
      if (this.scenes[sceneName].sourceAliases[alias] === sourceName)
        return alias;
    }
  }

  hasSourceAlias(sourceAlias: string, sceneName?: string) {
    sceneName = sceneName || this.currentScene;
    return (
      this.scenes[sceneName] &&
      sourceAlias in this.scenes[sceneName].sourceAliases
    );
  }

  getAliases(sceneName?: string) {
    const scene = this.scenes[sceneName || this.currentScene];
    return scene ? Object.keys(scene.sourceAliases) : null;
  }

  /**
  Takes a chat message and parses it into zero or more set window commands
  @param msg the message from chat
  @return an array of zero or more dictionaries of the format: { index: Number, name: String }
  */
  parseChatCommands(msg: string) {
    const commands: any[] = [];

    if (this.currentScene && this.scenes[this.currentScene]) {
      // Only if we've loaded from OBS
      const words = msg
        .trim()
        .toLowerCase()
        .replace(/[\d]+[\s]+[\D]+/g, (s) => {
          return s.replace(/[\s]+/, '');
        }) // replace something like '1 treat' with '1treat'
        .replace(/[a-z][\s]+[:]/g, (s) => {
          return s.replace(/[\s]+/g, '');
        }) // remove spaces before a colon
        .replace(/[a-z][:][\s]+/g, (s) => {
          return s.replace(/[\s]+/g, '');
        }) // remove spaces after a colon
        .replace(/[!]+[\S]+[\s]+/, '') // remove the !cam at the beginning
        .split(/[\s]+/); // split on whitespace

      let n = 0;
      words.forEach((word) => {
        const i = word.search(/\D/); // Find the first non-digit character
        const camName = word.slice(i); // get everything including and after the first non-digit character
        if (camName in this.scenes[this.currentScene].sourceAliases) {
          // Only add a commmand if there are aliases for the camera name
          const camIndex = i === 0 ? 0 : parseInt(word.slice(0, i)); // Assume 0 unless it starts with a number
          if (camIndex < this.scenes[this.currentScene].cams.length) {
            // Only add it if there's a camera window available
            commands[n++] = {
              index: camIndex,
              name: this.scenes[this.currentScene].sourceAliases[camName],
            }; // Add the command to the array
          }
        }
      });
    }

    return commands;
  }

  /**
  Takes a chat message and executes zero or more set window commands and updates OBS
  @param msg the chat message to process
  */
  processChat(msg: string) {
    if (this.currentScene && this.scenes[this.currentScene]) {
      this.parseChatCommands(msg).forEach((c) => {
        this.setWindow(c.index, c.name);
      });
      this.updateOBS(this.currentScene);
    } else {
      this.logger.warn(
        'Chat command cannot be processed because OBS has not been loaded yet'
      );
    }
  }

  /**
  Determine whether the specified camera is currnetly in view
  @param camera the camera name
  @return true if the camera is currently shown in a window
  */
  inView(cam: any) {
    return (
      this.currentScene &&
      this.scenes[this.currentScene] &&
      cam in this.scenes[this.currentScene].cams
    );
  }

  setWindow(index: number, name: string) {
    if (this.currentScene && this.scenes[this.currentScene]) {
      let currentIndex = -1;
      this.logger.info(
        `Setting cam${index} to '${name}' for scene '${this.currentScene}'`
      );

      try {
        // get index of where the specified source is currently
        for (let x = 0; x < this.scenes[this.currentScene].cams.length; x++) {
          if (this.scenes[this.currentScene].cams[x] === name) currentIndex = x;
        }

        if (index !== currentIndex) {
          // It's either not in a window or we're moving it to a different one
          this.scenes[this.currentScene].changedCams.add(name);
          if (currentIndex > -1) {
            // It's already displayed in a window
            // Set the current window to whatever it's replacing
            const swap = this.scenes[this.currentScene].cams[index];
            this.scenes[this.currentScene].changedCams.add(swap);
            this.scenes[this.currentScene].cams[currentIndex] = swap;
            this.logger.info(
              `Swapping cam${currentIndex} with '${swap}' for scene '${this.currentScene}'`
            );
          } else {
            // It's replacing, so let's disable the replaced camera
            this.scenes[this.currentScene].changedCams.add(
              this.scenes[this.currentScene].cams[index]
            );
            this.logger.info(
              `Source '${
                this.scenes[this.currentScene].cams[index]
              }' moved out of scene '${this.currentScene}'`
            );
          }

          this.scenes[this.currentScene].cams[index] = name;
        }
      } catch (e) {
        this.logger.error(`Error setting window: ${JSON.stringify(e)}`);
      }
    }
  }

  getWindowX(index: number, scene: any) {
    const sceneName = scene || this.currentScene;
    if (this.scenes[sceneName].windows.length > index)
      return this.scenes[sceneName].windows[index].position.x;
  }

  setWindowX(index: number, value: any, scene: any) {
    const sceneName = scene || this.currentScene;
    if (this.scenes[sceneName].windows.length > index) {
      const old = this.scenes[sceneName].windows[index].position.x;
      if (value !== old) {
        this.scenes[sceneName].changedWindows.add(index);
        this.scenes[sceneName].windows[index].position.x = value;
      }
    }
  }

  getWindowY(index: number, scene: string) {
    const sceneName = scene || this.currentScene;
    if (this.scenes[sceneName].windows.length > index)
      return this.scenes[sceneName].windows[index].position.y;
  }

  setWindowY(index: number, value: any, scene: string) {
    const sceneName = scene || this.currentScene;
    if (this.scenes[sceneName].windows.length > index) {
      const old = this.scenes[sceneName].windows[index].position.y;
      if (value !== old) {
        this.scenes[sceneName].changedWindows.add(index);
        this.scenes[sceneName].windows[index].position.y = value;
      }
    }
  }

  getWindowWidth(index: number, scene: string) {
    const sceneName = scene || this.currentScene;
    if (this.scenes[sceneName].windows.length > index)
      return this.scenes[sceneName].windows[index].width;
  }

  setWindowWidth(index: number, value: any, scene: string) {
    const sceneName = scene || this.currentScene;
    if (this.scenes[sceneName].windows.length > index) {
      const old = this.scenes[sceneName].windows[index].width;
      if (value !== old) {
        this.scenes[sceneName].changedWindows.add(index);
        this.scenes[sceneName].windows[index].width = value;
      }
    }
  }

  getWindowHeight(index: number, scene: string) {
    const sceneName = scene || this.currentScene;
    if (this.scenes[sceneName].windows.length > index)
      return this.scenes[sceneName].windows[index].height;
  }

  setWindowHeight(index: number, value: any, scene: string) {
    const sceneName = scene || this.currentScene;
    if (this.scenes[sceneName].windows.length > index) {
      const old = this.scenes[sceneName].windows[index].height;
      if (value !== old) {
        this.scenes[sceneName].changedWindows.add(index);
        this.scenes[sceneName].windows[index].height = value;
      }
    }
  }

  addSourceAlias(sourceAlias: string, sourceName: string, sceneName: string) {
    if (this.scenes[sceneName]) {
      this.scenes[sceneName].sourceAliases[
        sourceAlias.toLowerCase().replace(/\W/g, '-')
      ] = sourceName;
    }
  }

  removeAliasesForSource(sourceName: string, sceneName: string) {
    if (this.scenes[sceneName]) {
      for (const key in this.scenes[sceneName].sourceAliases) {
        if (this.scenes[sceneName].sourceAliases[key] === sourceName)
          delete this.scenes[sceneName].sourceAliases[key];
      }
    }
  }

  addSceneAlias(sceneAlias: string, sceneName: string) {
    if (
      sceneName &&
      sceneName.length > 0 &&
      sceneAlias &&
      sceneAlias.length > 0
    ) {
      this.sceneAliases[sceneAlias.toLowerCase().replace(/\W/g, '-')] =
        sceneName;
    }
  }

  removeAliasesForScene(sceneName: string) {
    if (sceneName) {
      for (const key in this.sceneAliases)
        if (this.sceneAliases[key] === sceneName) delete this.sceneAliases[key];
    }
  }

  renameCams(oldName: string, newName: string, sceneName: string) {
    if (sceneName && sceneName in this.scenes) {
      for (let i = 0; i < this.scenes[sceneName].cams.length; i++) {
        if (this.scenes[sceneName].cams[i] === oldName)
          this.scenes[sceneName].cams[i] = newName;
      }
    }
  }

  updateSourceWindow(sourceName: string, sceneName: string) {
    const cams = this.scenes[sceneName || this.currentScene].cams;
    const windows = this.scenes[sceneName || this.currentScene].windows;
    const source =
      this.scenes[sceneName || this.currentScene].sources[sourceName];
    for (let i = 0; i < cams.length; i++) {
      if (cams[i] === sourceName) {
        // Found the source in current visible cams
        windows[i].position.x = source.position.x;
        windows[i].position.y = source.position.y;
        if (source.width > 0) windows[i].width = source.width; // Bug #84: don't set windows to width 0
        if (source.height > 0) windows[i].height = source.height; // Bug #84: don't set windows to height 0
        break;
      }
    }
  }

  /**
   * Find a source from any of the scenes and return the kind if there is one.
   *
   * OBS doesn't provide the sourceKind on a changed item and sources have unique names across scenes, so look for one rather than query OBS for it.
   * @param {string} sourceName
   * @returns
   */
  getKindFromSource(sourceName: string) {
    for (const k of Object.keys(this.scenes)) {
      if (
        this.scenes[k].sources[sourceName] &&
        this.scenes[k].sources[sourceName].kind
      ) {
        return this.scenes[k].sources[sourceName].kind;
      }
    }
  }

  removeSource(sourceName: string, sceneName: string) {
    if (
      this.scenes[sceneName] &&
      sourceName in this.scenes[sceneName].sources
    ) {
      // Remove from aliases
      this.removeAliasesForSource(sourceName, sceneName);

      // Remove from the scenes sources
      delete this.scenes[sceneName].sources[sourceName];

      this.logger.info(
        `Removed source '${sourceName}' from scene '${sceneName}'`
      );
    }
  }

  renameSource(oldName: string, newName: string) {
    // Source names are unique in OBS, so if you rename one, it will change the name in every scene
    if (oldName !== newName) {
      for (const sceneName in this.scenes) {
        if (oldName in this.scenes[sceneName].sources) {
          this.scenes[sceneName].sources[newName] =
            this.scenes[sceneName].sources[oldName];
          this.scenes[sceneName].sources[newName].name = newName;
          delete this.scenes[sceneName].sources[oldName];
        }

        // Remove old aliases
        this.removeAliasesForSource(oldName, sceneName);

        // Add new aliases
        this.addSourceAlias(newName, newName, sceneName);

        // Update cams
        this.renameCams(oldName, newName, sceneName);
      }
      this.logger.info(`Renamed source '${oldName}' to '${newName}'`);
    }
  }

  setCurrentScene(sceneAlias: string) {
    const sceneName = this.sceneAliases[sceneAlias];
    if (sceneName) {
      const s: { [key: string]: any } = {};
      s['scene-name'] = sceneName;
      return this.obs.send('SetCurrentScene', s).catch((e: any) => {
        this.logger.error(
          `OBS error switching scenes: ${JSON.stringify(e, null, 2)}`
        );
      });
    }
  }

  renameScene(oldName: string, newName: string) {
    if (oldName in this.scenes) {
      // replace aliases
      this.removeAliasesForScene(oldName);
      this.addSceneAlias(newName, newName);

      // replace scenes
      this.scenes[newName] = this.scenes[oldName];
      delete this.scenes[oldName];

      if (this.currentScene === oldName) this.currentScene = newName;

      this.logger.info(`Renamed scene '${oldName}' to '${newName}'`);
    }
  }

  deleteScene(sceneName: string) {
    if (sceneName in this.scenes) delete this.scenes[sceneName];
    this.removeAliasesForScene(sceneName);
    this.logger.info(`Deleted scene '${sceneName}'`);
  }

  async addSourceItem(sourceName: any, kind: any, sceneName: string) {
    const sceneItem: { [key: string]: any } = { item: sourceName };
    sceneItem['scene-name'] = sceneName;

    return this.obs
      .send('GetSceneItemProperties', sceneItem) // Get the source info from obs
      .then((source: any) => {
        // Add the source to the scene
        this.scenes[sceneName].sources[source.name] = source;
        this.scenes[sceneName].sources[source.name].kind = kind;
      })
      .then(() => {
        // Add an alias for the new source
        this.addSceneAlias(sourceName, sourceName);
      })
      .then(() =>
        this.logger.info(
          `Added source '${sourceName}' for scene '${sceneName}'`
        )
      );
  }

  updateSourceItem(sceneName: any, source: any) {
    // Update the source object
    if (sceneName in this.scenes) {
      if (this.scenes[sceneName].sources[source.name] && !source.kind)
        source.kind = this.scenes[sceneName].sources[source.name].kind; // The kind may not be in the message, but we want to keep it
      this.scenes[sceneName].sources[source.name] = source;

      // Make sure there's an alias
      this.addSourceAlias(source.name, source.name, sceneName);

      // If it's currently in a window, update the window dimensions
      this.updateSourceWindow(source.name, sceneName);

      this.logger.info(
        `Updated source '${source.name}' in scene '${sceneName}'`
      );
      this.logger.debug(
        `Updated source '${
          source.name
        }' in scene '${sceneName}': ${JSON.stringify(source, null, 2)}`
      );
    } else
      this.logger.warn(
        `Source not updated. Scene '${sceneName}' doesn't exist`
      );
  }

  // Handlers for OBS events //////////////////////////////////////////////////
  sourceOrderChanged(data: any) {
    this.logger.info(`Source order changed for scene '${data.sceneName}'`);
    this.logger.debug(
      `Event OBS:SourceOrderChanged: ${JSON.stringify(data, null, 2)}`
    );
  }

  sceneItemVisibilityChanged(data: any) {
    const source = this.getSourceByName(data.itemName, data.sceneName);
    source.visible = data.itemVisible;
    this.logger.info(
      `${data.itemVisible ? 'Show' : 'Hide'} source '${
        data.itemName
      }' in scene '${data.sceneName}'`
    );
    this.logger.debug(
      `Event OBS:SceneItemVisibilityChanged: ${JSON.stringify(data, null, 2)}`
    );
  }

  sceneItemTransformChanged(data: any) {
    // Update an existing source item
    const source = data.transform;
    source.name = data['item-name'];

    if (
      this.scenes[data['scene-name']] &&
      (!this.scenes[data['scene-name']].sources[data['item-name']] ||
        !this.scenes[data['scene-name']].sources[data['item-name']].kind)
    ) {
      // This source already exists in at least one other scene
      source.kind = this.getKindFromSource(data['item-name']); // Grab the kind from it so we don't have to query OBS
    }

    this.updateSourceItem(data['scene-name'], source);
  }

  switchScenes(data: any) {
    if (this.currentScene !== data.sceneName) {
      this.logger.info(
        `Switched scene from '${this.currentScene}' to '${data.sceneName}'`
      );
      this.currentScene = data.sceneName;
    }
  }

  sourceRenamed(data: any) {
    switch (data.sourceType) {
      case 'scene':
        this.renameScene(data.previousName, data.newName);
        break;
      case 'input':
        this.renameSource(data.previousName, data.newName);
        break;
      case 'group':
        this.logger.info(`Renamed group '${data.sourceName}'`);
        break;
      default: // Shouldn't get here. Warn.
        this.logger.warn(
          `Renamed source '${data.sourceName}' of unknown type '${data.sourceType}'`
        );
    }
  }

  sourceDestroyed(data: any) {
    // Destroyed should be removed from all scenes
    switch (data.sourceType) {
      case 'scene':
        this.deleteScene(data.sourceName);
        break;
      case 'input':
        this.logger.info(`Removed source '${data.sourceName}' from all scenes`);
        break;
      case 'group':
        this.logger.info(`Removed group '${data.sourceName}' from all scenes`);
        break;
      default: // Shouldn't get here. Warn.
        this.logger.warn(
          `Removed source '${data.sourceName}' of unknown type '${data.sourceType}' from all scenes`
        );
    }
  }

  sourceItemRemoved(data: any) {
    this.removeSource(data['item-name'], data['scene-name']);
  }

  sourceCreated(data: any) {
    if (data.sourceType === 'scene') {
      // Only log; OBS will trigger a ScenesChanged event with the data
      this.logger.info(`Created scene '${data.sourceName}'`);
    } else if (data.sourceType === 'input') {
      this.addSourceItem(
        data.sourceName,
        data.sourceKind,
        this.currentScene
      ).catch((e) =>
        this.logger.error(
          `Unable to add new source '${data.sourceName}' for scene '${
            this.currentScene
          }': ${JSON.stringify(e)}`
        )
      );
    } else
      this.logger.info(`Created source '${JSON.stringify(data, null, 2)}'`);
  }

  async scenesChanged(data: any) {
    this.logger.debug(`Updating scenes: ${JSON.stringify(data, null, 2)}`);
    return this.scenesRenderer
      .getScenes(data.scenes, this.windowKinds)
      .then((scenes) => {
        this.scenes = scenes;
        this.sceneAliases = this.getSceneAliases(scenes);

        this.logger.info(
          `OBS scenes changed: '${Object.keys(this.scenes).join("', '")}'`
        );
      })
      .catch((e) => {
        this.logger.error(`Error updated scene change: ${JSON.stringify(e)}`);
      });
  }
  /// //////////////////////////////////////////////////////////////////////////

  /**
   * Given an obs connection, grab all the scenes and resources to construct the cams and windows
   */
  async syncFromObs() {
    // Grab all the scenes from OBS
    return this.obs.send('GetSceneList').then(async (data: any) => {
      this.currentScene = data['current-scene'];
      this.logger.info(`Current OBS scene: '${this.currentScene}'`);
      return this.scenesRenderer
        .getScenes(data.scenes, this.windowKinds)
        .then((scenes) => {
          this.scenes = scenes;
          this.sceneAliases = this.getSceneAliases(scenes);

          this.logger.info(
            `Synced scenes from OBS: '${Object.keys(this.scenes).join("', '")}'`
          );
        })
        .catch((e) => {
          this.logger.error(`Error syncing from OBS: ${JSON.stringify(e)}`);
        });
    });
  }

  /**
  Update OBS with only the cameras that have changed
  */
  updateOBS(sceneName: string) {
    sceneName = sceneName || this.currentScene;
    if (sceneName) {
      const windows = this.getWindows(this.scenes[sceneName]);

      if (this.scenes[sceneName].changedCams.size > 0) {
        this.logger.info(
          `Changed cams: ${Array.from(this.scenes[sceneName].changedCams).join(
            ', '
          )}`
        );
      }
      if (this.scenes[sceneName].changedWindows.size > 0) {
        this.logger.info(
          `Changed windows: ${Array.from(
            this.scenes[sceneName].changedWindows
          ).join(', ')}`
        );
      }
      this.logger.debug(
        `Updated windows: ${JSON.stringify(windows, null, '  ')}`
      );

      let i = 0;
      Promise.all(
        windows.map(async (window: any) => {
          if (
            this.scenes[sceneName].changedCams.has(window.item) ||
            this.scenes[sceneName].changedWindows.has(i++)
          ) {
            return this.obs
              .send('SetSceneItemProperties', window)
              .catch((err: any) => {
                this.logger.warn(
                  `Unable to set OBS properties '${
                    window.item
                  }' for scene '${sceneName}': ${JSON.stringify(err)}`
                );
              })
              .then(() => {
                this.scenes[sceneName].changedCams.delete(window.item);
                this.scenes[sceneName].changedWindows.delete(i - 1);
              });
          }
        })
      )
        .then(() => {
          // Anything left needs to be hidden
          this.scenes[sceneName].changedCams.forEach((cam: any) => {
            if (!this.scenes[sceneName].cams.includes(cam)) {
              const view: { [key: string]: any } = {
                source: cam,
                render: false,
              };
              view['scene-name'] = sceneName;
              this.obs
                .send('SetSceneItemRender', view)
                .catch((err: any) => {
                  this.logger.warn(
                    `Unable to hide OBS view '${cam}' for scene '${sceneName}': ${err.error}`
                  );
                })
                .then(() => {
                  this.scenes[sceneName].changedCams.delete(cam);
                });
            }
          });
        })
        .catch((e) => {
          this.logger.error(
            `Error updating obs scene windows: ${JSON.stringify(e)}`
          );
        });

      this.storedWindows = windows;
    }
  }

  // TODO: implement the ability to timeout a user for abusing the cams
  cameraTimeout(user: any) {
    return false;
  }
}
