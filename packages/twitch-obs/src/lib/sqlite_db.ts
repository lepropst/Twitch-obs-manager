import { ISqlite, open } from 'sqlite';

// you would have to import / invoke this in another file
export async function openDb(props: {
  logger: Console | any;
  config: ISqlite.Config;
}) {
  const db = await open(props.config);
  props.logger.log(`db opened ${db.config.filename.toString()}`);
  return db;
}
