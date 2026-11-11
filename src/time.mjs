export const CITY_TIME_ZONE = "Europe/Sofia";

const clockFormatters = {
  seconds: new Intl.DateTimeFormat("en-GB", {
    timeZone: CITY_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }),
  minutes: new Intl.DateTimeFormat("en-GB", {
    timeZone: CITY_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }),
};
const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: CITY_TIME_ZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const zoneFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: CITY_TIME_ZONE,
  timeZoneName: "short",
});

export function formatCityTime(date = new Date(), { seconds = true } = {}) {
  return clockFormatters[seconds ? "seconds" : "minutes"].format(date);
}

export function formatCityDate(date = new Date()) {
  return dateFormatter.format(date).toUpperCase();
}

export function formatCityTimeZone(date = new Date()) {
  return zoneFormatter
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName").value;
}
