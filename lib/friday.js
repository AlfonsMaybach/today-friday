export function isFridayNow() {
  const timeZone = process.env.APP_TIMEZONE || 'Europe/Moscow';
  const weekday = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone
  }).format(new Date());

  return weekday === 'Fri';
}
