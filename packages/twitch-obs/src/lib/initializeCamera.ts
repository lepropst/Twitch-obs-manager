// worried about names
// we will return a list of names based off the configurations cameras. For static this means nothing, in the future PTZ cams need initialization.

export function initializeCamera(
  config: { static: string[]; [key: string]: { [key: string]: any } },
  camera_type: string,
  options = {}
) {
  const names: { name: string; options?: any }[] = [];
  try {
    if (camera_type === 'static') {
      config.static.forEach((e) => {
        names.push({ name: e });
      });
    } else {
      // initialize PTZ cameras
    }
    return names;
  } catch (e) {
    console.error(e);
    return [];
  }
}
export default initializeCamera;
