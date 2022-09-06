import { twitchObs } from './twitch-obs';

describe('twitchObs', () => {
  it('should work', () => {
    expect(twitchObs()).toEqual('twitch-obs');
  });
});
