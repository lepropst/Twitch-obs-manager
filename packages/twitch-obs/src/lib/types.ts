import { ISqlite } from 'sqlite';
import { Options } from 'tmi.js';

export type Config = {
  obs: {
    url: string;
    password?: string;
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
  commands: { name: string; chatOutput: string }[];
  views: { name: string; alias: string[] }[];
  twitch_channel: string;
  action: () => void;
  logger: any;
  cams: {
    cameras: {
      static: string[];
      [key: string]: { [key: string]: any };
    };
    names: string[];
  };
  windows: { sourceKinds: string[]; [key: string]: any };
  sqlite_options: ISqlite.Config;
  admins: string[];
  defaultCamera: string;
};
