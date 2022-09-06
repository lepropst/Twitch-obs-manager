export function isSubscriber(context) {
  return context.subscriber || isModerator(context);
}

export function isModerator(admins: string[], context) {
  return (
    context.mod ||
    admins.has(context.username.toLowerCase()) ||
    isBroadcaster(context)
  );
}

export function isBroadcaster(context) {
  return context.badges && context.badges.broadcaster;
}
