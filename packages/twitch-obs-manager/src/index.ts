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
      address: 'localhost:4444',
      password: '143Jdaniel!',
    },
    tmi: {
      options: {
        debug: process.env['NODE_ENV'] === 'PRODUCTION' ? false : true,
      },
      identity: {
        username: 'kunekunepigs',
        password: 'oauth:u2nlsooae7x2yvmqz3wlndyh2wqvj6',
      },
      channels: ['HalbertFarm'],
    },
    views: [
      { name: 'Cam 1', alias: 'cam1' },
      { name: 'Cam 2', alias: 'cam2' },
      // { name: 'Cam 3' },
      // { name: 'Cam 4' },
      // { name: 'Cam 5' },
      // { name: 'Cam 6' },
      // { name: 'Cam 7' },
      // { name: 'Cam 8' },
    ],
    twitch_channel: '#halbertfarm',
    action: function (): void {
      console.log('Executing subscriber free event');
    },
  };
  twitchObsManager(config);
};

example();
