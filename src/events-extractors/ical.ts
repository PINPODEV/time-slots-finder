import ICal2JSON, { JSONCal } from "ical2json"
import dayjs, { Dayjs } from "dayjs"
import { DayjsPeriod } from "../types"

export function extractEventsFromICal(
	calendarData: string,
	preferredTimeZone: string
): DayjsPeriod[] {
	const iCalendarJSONData = ICal2JSON.convert(calendarData)

	const vCalendar = (iCalendarJSONData.VCALENDAR as JSONCal)[0] as JSONCal
	const calendarTimeZone = vCalendar["X-WR-TIMEZONE"] as string
	const vEvents = vCalendar.VEVENT as JSONCal[] ?? []
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
			try {
				const startDate = _parseICalDate(vEvent[startDateKey] as string, parsedTimeZone)
				const endDate = _parseICalDate(vEvent[endDateKey] as string, parsedTimeZone)
				return {
					startAt: startDate.tz(preferredTimeZone),
					endAt: endDate.tz(preferredTimeZone),
				}
			} catch (_) {
				return null
			}
		})
		.filter((event) => event) as DayjsPeriod[]
}

function _parseICalDate(dateString: string, timeZone: string): Dayjs {
	if (dateString.length > 15) {
		const offset = parseInt(dateString.slice(15).replace(":", "."), 10)
		return dayjs(dateString.slice(0, 15)).utcOffset(Number.isNaN(offset) ? 0 : offset, true)
	}
	return dayjs.tz(dateString, timeZone)
}
