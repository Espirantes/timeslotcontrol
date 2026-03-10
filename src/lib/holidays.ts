import Holidays from "date-holidays";

/**
 * Get public holidays for a given country and month.
 * Returns array of { date: "YYYY-MM-DD", name: string }.
 */
export function getHolidaysForMonth(
  country: string,
  year: number,
  month: number, // 0-based (January = 0)
): Array<{ date: string; name: string }> {
  const hd = new Holidays(country);
  return hd
    .getHolidays(year)
    .filter((h) => h.type === "public")
    .filter((h) => {
      const d = new Date(h.date);
      return d.getMonth() === month;
    })
    .map((h) => ({
      date: h.date.slice(0, 10),
      name: h.name,
    }));
}

/**
 * Check if a specific date is a public holiday for the given country.
 */
export function checkHoliday(
  country: string,
  date: Date,
): { isHoliday: boolean; name?: string } {
  const hd = new Holidays(country);
  const result = hd.isHoliday(date);
  if (result) {
    const publicHoliday = result.find((h) => h.type === "public");
    if (publicHoliday) {
      return { isHoliday: true, name: publicHoliday.name };
    }
  }
  return { isHoliday: false };
}
