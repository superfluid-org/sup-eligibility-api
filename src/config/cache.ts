import ExpiryMap from "expiry-map";

export const halfDayCache = new ExpiryMap(1000 * 60 * 60 * 12);
export const oneWeekCache = new ExpiryMap(1000 * 60 * 60 * 24 * 7);
export const oneHourCache = new ExpiryMap(1000 * 60 * 60);