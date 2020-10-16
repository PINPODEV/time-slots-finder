import { extractEventsFromICal } from "./ical"
import { DayjsPeriod, TimeSlotsFinderCalendarFormat } from "../types"
import { TimeSlotsFinderError } from "../errors"

type extractFunction = (calendarData: string, timeZone: string) => DayjsPeriod[]

const formatExtractorMap: { [key: string]: extractFunction } = {
	[TimeSlotsFinderCalendarFormat.iCal]: extractEventsFromICal,
}

export function extractEventsFromCalendar(
	timeZone: string,
	format?: TimeSlotsFinderCalendarFormat,
	calendar?: string
): DayjsPeriod[] {
	if (!calendar) {
		return []
	}
	if (!format || !formatExtractorMap[format]) {
		throw new TimeSlotsFinderError(`Invalid format for calendar data: ${format}`)
	}
	return formatExtractorMap[format](calendar, timeZone)
}
