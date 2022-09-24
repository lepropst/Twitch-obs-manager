export default function BlackList(str?: string) {
  if (str && process.env['BLACKLIST']) {
    if (process.env['BLACKLIST'].includes(str)) {
      return false;
    } else {
      return true;
    }
  }
  return false;
}
