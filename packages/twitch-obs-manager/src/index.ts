import { Config, twitchObsManager } from './lib/twitch-obs-manager';
export * from './lib/twitch-obs-manager';
/**
 * Params object
 *
 * obs: {
 *     address: string;
 *     password: string;
 *   };
 *   tmi: Options;
 *   PTZ?: {
 *     cameras: {
 *       label: string;
 *       hostname: string;
 *       username: string;
 *       password: string;
 *       version: number;
 *     }[];
 *   };
 *   views: { name: string }[];
 *   twitch_channel: string;
 *   action: () => void;
 **/

export const example = () => {
  const config: Config = {
    obs: {
      url: 'ws://127.0.0.1:4455',
      password: '143Jdaniel!@#$',
    },
    tmi: {
      options: {
        debug: process.env['NODE_ENV'] === 'PRODUCTION' ? false : true,
      },
      identity: {
        username: 'test_bot_elias',
        // rebekas password: 'oauth:u2nlsooae7x2yvmqz3wlndyh2wqvj6',
        // password: 'oauth:ro8bw8d6g6gfprkaeluch7drqac6fx',
        password: 'oauth:h4i7shv1sufbidtx8vc6t7ktil24q9',
      },
      channels: ['elias_elreyes'],
    },

    views: [
      { name: 'Cam 1', alias: ['cam 1'] },
      { name: 'Cam 2', alias: ['cam 2'] },
      { name: 'Cam 3', alias: ['cam 3'] },
      { name: 'Cam 4', alias: ['cam 4'] },
      { name: 'Cam 5', alias: ['cam 5'] },
      { name: 'Cam 6', alias: ['cam 6'] },
      { name: 'Cam 7', alias: ['cam 7'] },
      { name: 'Cam 8', alias: ['cam 8'] },
    ],
    commands: [
      {
        name: 'test command',
        chatOutput: 'This is an example function',
      },
    ],
    twitch_channel: '#halbertfarm',
    action: function (): void {
      console.log('Executing subscriber free event');
    },
  };
  twitchObsManager(config);
};

example();
