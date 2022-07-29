import { Config, twitchObsManager } from './lib/twitch-obs-manager';
export * from './lib/twitch-obs-manager';

// obs: {
//     address: string;
//     password: string;
//   };
//   tmi: Options;
//   PTZ?: {
//     cameras: {
//       label: string;
//       hostname: string;
//       username: string;
//       password: string;
//       version: number;
//     }[];
//   };
//   views: { name: string }[];
//   twitch_channel: string;
//   action: () => void;
export const example = () => {
  const config: Config = {
    obs: {
      address: '192.168.1.26',
      password: 'fooFakePassword',
    },
    tmi: {
      options: {
        debug: process.env['NODE_ENV'] === 'PRODUCTION' ? false : true,
      },
      identity: {
        username: 'my_bot_name',
        password: 'oauth:my_bot_token',
      },
      channels: ['HalbertFarms'],
    },
    views: [
      { name: 'cam1' },
      { name: 'cam2' },
      { name: 'cam3' },
      { name: 'cam4' },
      { name: 'cam5' },
      { name: 'cam6' },
    ],
    twitch_channel: 'HalbertFarms',
    action: function (): void {
      console.log('Executing subscriber free event');
    },
  };
  twitchObsManager(config);
};

example();
