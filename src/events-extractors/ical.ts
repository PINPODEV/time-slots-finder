import ICal2JSON, { JSONCal } from "ical2json"
import dayjs from "dayjs"
import { DayjsPeriod } from "../types"

export function extractEventsFromICal(
	calendarData: string,
	preferredTimeZone: string
): DayjsPeriod[] {
	const iCalendarJSONData = ICal2JSON.convert(calendarData)

	const vCalendar = (iCalendarJSONData.VCALENDAR as JSONCal)[0] as JSONCal
	const calendarTimeZone = vCalendar["X-WR-TIMEZONE"] as string
	const vEvents = vCalendar.VEVENT as JSONCal[]
	return vEvents
		.map((vEvent) => {
			const keys = Object.keys(vEvent)
			const startDateKey = keys.find((key) => key.startsWith("DTSTART"))
			if (!startDateKey) {
				return null
			}
			const eventTimeZone = startDateKey?.match(/^DTSTART;TZID=(.*)$/)?.[1]
			const endDateKey = eventTimeZone ? `DTEND;TZID=${eventTimeZone}` : `DTEND`
			const parsedTimeZone = eventTimeZone || calendarTimeZone
			const startDate = dayjs.tz(vEvent[startDateKey] as string, parsedTimeZone)
			const endDate = dayjs.tz(vEvent[endDateKey] as string, parsedTimeZone)
			if (!startDate.isValid() || !endDate.isValid()) {
				return null
			}
			return {
				startAt: startDate.tz(preferredTimeZone),
				endAt: endDate.tz(preferredTimeZone),
			}
		})
		.filter((event) => event) as DayjsPeriod[]
}
