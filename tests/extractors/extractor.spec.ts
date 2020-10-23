import { mocked } from "ts-jest/utils"
import { extractEventsFromCalendar } from "../../src/events-extractors/extractor"
import { TimeSlotsFinderError } from "../../src/errors"
import { extractEventsFromICal } from "../../src/events-extractors/ical"
import { TimeSlotsFinderCalendarFormat } from "../../src"
import iCalTestJSON from "../resources/calendar-ical.json"

const iCalData = (iCalTestJSON as unknown as { data: string }).data

jest.mock("../../src/events-extractors/ical")
mocked(extractEventsFromICal, true)

describe("Events extractor", () => {
	it("should return an empty array if no calendar data passed", () => {
		expect(extractEventsFromCalendar("Europe/Paris")).toEqual([])
	})
	it("should throw if invalid format is provided", () => {
		expect(() => extractEventsFromCalendar("Europe/Paris", "incorrect" as never, "something"))
			.toThrowError(new TimeSlotsFinderError("Invalid format for calendar data: incorrect"))
		expect(() => extractEventsFromCalendar("Europe/Paris", null as never, "something"))
			.toThrowError(new TimeSlotsFinderError("Invalid format for calendar data: null"))
	})
	it("should use the right function for extract data depending on the format", () => {
		mocked(extractEventsFromICal).mockImplementationOnce(() => [])
		mocked(extractEventsFromICal).mockClear()
		expect(mocked(extractEventsFromICal).mock.calls.length).toBe(0)
		extractEventsFromCalendar("Europe/Paris", TimeSlotsFinderCalendarFormat.iCal, iCalData)
		expect(mocked(extractEventsFromICal).mock.calls.length).toBe(1)
	})
})
