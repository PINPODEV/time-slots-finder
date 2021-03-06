import dayjs from "dayjs"

import { extractEventsFromCalendar } from "../../src/events-extractors/extractor"

import iCalTestJSON from "../resources/calendar-ical.json"
import iCalTestEmptyJSON from "../resources/calendar-ical-empty.json"
import iCalTestOffsetJSON from "../resources/calendar-ical-offset.json"
import { TimeSlotsFinderCalendarFormat } from "../../src"
import MockDate from "mockdate"

const iCalData = (iCalTestJSON as unknown as { data: string }).data
const iCalEmptyData = (iCalTestEmptyJSON as unknown as { data: string }).data
const iCalOffsetData = (iCalTestOffsetJSON as unknown as { data: string }).data

describe("iCal calendar extractor", () => {
	beforeAll(() => MockDate.set(new Date("2020-10-15T15:03:12.592Z")))
	afterAll(() => MockDate.reset())
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
	it("should properly extract events from iCal formatted strings with offset", () => {
		const timeZone = "Europe/Paris"
		const events = extractEventsFromCalendar(
			timeZone,
			TimeSlotsFinderCalendarFormat.iCal,
			iCalOffsetData
		)
		/* Events with invalid or without start or end date should be ignored */
		expect(events).toEqual([
			{
				endAt: dayjs("2020-10-30T10:00:00.000Z").tz(timeZone),
				startAt: dayjs("2020-10-30T08:00:00.000Z").tz(timeZone),
			},
			{
				endAt: dayjs("2020-10-29T15:00:00.000Z").tz(timeZone),
				startAt: dayjs("2020-10-29T13:00:00.000Z").tz(timeZone),
			},
			{
				endAt: dayjs("2020-10-29T12:00:00.000Z").tz(timeZone),
				startAt: dayjs("2020-10-29T11:00:00.000Z").tz(timeZone),
			},
			{
				endAt: dayjs("2020-10-28T16:00:00.000Z").tz(timeZone),
				startAt: dayjs("2020-10-28T15:00:00.000Z").tz(timeZone),
			},
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
	it("should not throw for empty calendar", () => {
		const events = extractEventsFromCalendar(
			"Europe/Paris",
			TimeSlotsFinderCalendarFormat.iCal,
			iCalEmptyData
		)
		expect(Array.isArray(events)).toBe(true)
		expect(events.length).toBe(0)
	})
})
