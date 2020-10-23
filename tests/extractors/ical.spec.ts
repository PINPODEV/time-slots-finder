import dayjs from "dayjs"

import { extractEventsFromCalendar } from "../../src/events-extractors/extractor"

import iCalTestJSON from "../resources/calendar-ical.json"
import { TimeSlotsFinderCalendarFormat } from "../../src"

const iCalData = (iCalTestJSON as unknown as { data: string }).data

describe("iCal calendar extractor", () => {
	it("should properly extract events from iCal formatted strings", () => {
		const timeZone = "Europe/Paris"
		const events = extractEventsFromCalendar(
			timeZone,
			TimeSlotsFinderCalendarFormat.iCal,
			iCalData
		)
		/* Events with invalid or without start or end date should be ignored */
		expect(events).toEqual([
			{
				endAt: dayjs("2020-10-16T08:00:00.000Z").tz(timeZone),
				startAt: dayjs("2020-10-16T07:00:00.000Z").tz(timeZone),
			},
			{
				endAt: dayjs("2020-10-16T09:15:00.000Z").tz(timeZone),
				startAt: dayjs("2020-10-16T08:15:00.000Z").tz(timeZone),
			},
			{
				endAt: dayjs("2020-10-16T12:45:00.000Z").tz(timeZone),
				startAt: dayjs("2020-10-16T11:45:00.000Z").tz(timeZone),
			},
			{
				endAt: dayjs("2020-10-16T13:00:00.000Z").tz(timeZone),
				startAt: dayjs("2020-10-16T12:15:00.000Z").tz(timeZone),
			},
			{
				endAt: dayjs("2020-10-16T14:30:00.000Z").tz(timeZone),
				startAt: dayjs("2020-10-16T14:00:00.000Z").tz(timeZone),
			},
			{
				endAt: dayjs("2020-10-16T15:45:00.000Z").tz(timeZone),
				startAt: dayjs("2020-10-16T15:15:00.000Z").tz(timeZone),
			},
			{
				endAt: dayjs("2020-10-17T15:00:00.000Z").tz(timeZone),
				startAt: dayjs("2020-10-17T14:30:00.000Z").tz(timeZone),
			},
			{
				endAt: dayjs("2020-10-17T14:30:00.000Z").tz(timeZone),
				startAt: dayjs("2020-10-17T14:00:00.000Z").tz(timeZone),
			},
			{
				endAt: dayjs("2020-10-17T13:30:00.000Z").tz(timeZone),
				startAt: dayjs("2020-10-17T12:45:00.000Z").tz(timeZone),
			},
			{
				endAt: dayjs("2020-10-17T10:45:00.000Z").tz(timeZone),
				startAt: dayjs("2020-10-17T09:45:00.000Z").tz(timeZone),
			}
		])
	})
	it("should convert extracted events to the provided time zone", () => {
		const events = extractEventsFromCalendar(
			"America/New_York",
			TimeSlotsFinderCalendarFormat.iCal,
			iCalData
		)
		expect(events[0].startAt.format("Z")).toBe("-04:00")
		const events2 = extractEventsFromCalendar(
			"Australia/Sydney",
			TimeSlotsFinderCalendarFormat.iCal,
			iCalData
		)
		expect(events2[0].startAt.format("Z")).toBe("+11:00")
	})
})
