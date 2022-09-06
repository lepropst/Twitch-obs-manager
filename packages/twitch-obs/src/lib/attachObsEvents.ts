import ObsWebSocket from 'obs-websocket-js';

export function attachObsEvents(
  obs: ObsWebSocket,
  obsView: any,
  logger: Console | any,
  reconnectCallback: () => void
) {
  obs.on('ConnectionOpened', () => {
    logger.info('== OBS connection opened');
  });
  obs.on('ConnectionClosed', () => {
    logger.info('== OBS connection closed');
    reconnectCallback();
  });
  obs.on('AuthenticationSuccess', () => {
    logger.info('== OBS successfully authenticated');
  });
  obs.on('AuthenticationFailure', () => {
    logger.info('== OBS failed authentication');
  });
  obs.on('SceneItemVisibilityChanged', (data) =>
    obsView.sceneItemVisibilityChanged(data)
  );
  obs.on('SourceOrderChanged', (data) => obsView.sourceOrderChanged(data));
  obs.on('SceneItemTransformChanged', (data) =>
    obsView.sceneItemTransformChanged(data)
  );
  obs.on('SwitchScenes', (data) => obsView.switchScenes(data));
  obs.on('SourceRenamed', (data) => obsView.sourceRenamed(data));
  obs.on('SourceCreated', (data) => obsView.sourceCreated(data));
  obs.on('ScenesChanged', (data) => obsView.scenesChanged(data));
  obs.on('SourceDestroyed', (data) => obsView.sourceDestroyed(data));
  obs.on('SceneItemRemoved', (data) => obsView.sourceItemRemoved(data));
  obs.on('error', (err) =>
    logger.error(`== OBS error: ${JSON.stringify(err)}`)
  );
}
