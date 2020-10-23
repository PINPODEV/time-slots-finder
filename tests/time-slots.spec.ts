import { getAvailableTimeSlotsInCalendar } from "../src"
import MockDate from "mockdate"
import iCalTestJSON from "./resources/calendar-ical.json"
import { TimeSlotsFinderError } from "../src/errors"

const iCalData = (iCalTestJSON as unknown as { data: string }).data

const baseConfig = {
	timeSlotDuration: 15,
	availablePeriods: [{
		isoWeekDay: 5,
		shifts: [{ startTime: "10:00", endTime: "20:00" }]
	}],
	timeZone: "Europe/Paris",
}

describe("Time Slot Finder", () => {
	beforeEach(() => MockDate.reset())

	it("should return slots even without calendar data", () => {
		MockDate.set(new Date("2020-10-14T15:00:00.000Z"))
		const slots = getAvailableTimeSlotsInCalendar({
			configuration: {
				timeSlotDuration: 60,
				availablePeriods: [{
					isoWeekDay: 4,
					shifts: [{ startTime: "12:00", endTime: "22:00" }]
				}],
				timeZone: "Europe/Paris",
			},
			from: new Date("2020-10-15T15:00:00.000Z"),
			to: new Date("2020-10-15T20:00:00.000Z"),
		})
		expect(slots.length).toBe(5)
	})
	it("should handle properly timeSlotDuration parameter", () => {
		MockDate.set(new Date("2020-10-14T15:00:00.000Z"))
		const slots = getAvailableTimeSlotsInCalendar({
			configuration: {
				timeSlotDuration: 45,
				availablePeriods: [{
					isoWeekDay: 4,
					shifts: [{ startTime: "12:00", endTime: "22:00" }]
				}],
				timeZone: "Europe/Paris",
			},
			from: new Date("2020-10-15T15:00:00.000Z"),
			to: new Date("2020-10-15T20:00:00.000Z"),
		})
		slots.forEach((slot) => expect(slot.duration).toBe(45))
		const slots2 = getAvailableTimeSlotsInCalendar({
			configuration: {
				timeSlotDuration: 15,
				availablePeriods: [{
					isoWeekDay: 4,
					shifts: [{ startTime: "12:00", endTime: "22:00" }]
				}],
				timeZone: "Europe/Paris",
			},
			from: new Date("2020-10-15T15:00:00.000Z"),
			to: new Date("2020-10-15T20:00:00.000Z"),
		})
		slots2.forEach((slot) => expect(slot.duration).toBe(15))
	})
	it("should handle properly slotStartMinuteMultiple parameter", () => {
		MockDate.set(new Date("2020-10-15T15:03:12.592Z"))
		const slots = getAvailableTimeSlotsInCalendar({
			configuration: {
				timeSlotDuration: 10,
				slotStartMinuteMultiple: 5,
				availablePeriods: [{
					isoWeekDay: 4,
					shifts: [{ startTime: "12:00", endTime: "22:00" }]
				}],
				timeZone: "Europe/Paris",
			},
			from: new Date("2020-10-15T15:00:00.000Z"),
			to: new Date("2020-10-15T16:00:00.000Z"),
		})
		expect(slots.length).toBe(5)
		expect(slots[0].startAt.toISOString()).toBe("2020-10-15T15:05:00.000Z")
		expect(slots[1].startAt.toISOString()).toBe("2020-10-15T15:15:00.000Z")
		expect(slots[2].startAt.toISOString()).toBe("2020-10-15T15:25:00.000Z")
		expect(slots[3].startAt.toISOString()).toBe("2020-10-15T15:35:00.000Z")
		expect(slots[4].startAt.toISOString()).toBe("2020-10-15T15:45:00.000Z")

		const slots2 = getAvailableTimeSlotsInCalendar({
			configuration: {
				timeSlotDuration: 10,
				slotStartMinuteMultiple: 5,
				minAvailableTimeBeforeSlot: 2,
				availablePeriods: [{
					isoWeekDay: 4,
					shifts: [{ startTime: "12:00", endTime: "22:00" }]
				}],
				timeZone: "Europe/Paris",
			},
			from: new Date("2020-10-15T15:00:00.000Z"),
			to: new Date("2020-10-15T16:00:00.000Z"),
		})
		expect(slots2.length).toBe(3)
		expect(slots2[0].startAt.toISOString()).toBe("2020-10-15T15:10:00.000Z")
		expect(slots2[1].startAt.toISOString()).toBe("2020-10-15T15:25:00.000Z")
		expect(slots2[2].startAt.toISOString()).toBe("2020-10-15T15:40:00.000Z")
		const slots3 = getAvailableTimeSlotsInCalendar({
			configuration: {
				timeSlotDuration: 10,
				slotStartMinuteMultiple: 15,
				minAvailableTimeBeforeSlot: 5,
				minTimeBeforeFirstSlot: 45,
				availablePeriods: [{
					isoWeekDay: 4,
					shifts: [{ startTime: "12:00", endTime: "22:00" }]
				}],
				timeZone: "Europe/Paris",
			},
			from: new Date("2020-10-15T16:00:00.000Z"),
			to: new Date("2020-10-15T17:00:00.000Z"),
		})
		expect(slots3.length).toBe(4)
		expect(slots3[0].startAt.toISOString()).toBe("2020-10-15T16:00:00.000Z")
		expect(slots3[1].startAt.toISOString()).toBe("2020-10-15T16:15:00.000Z")
		expect(slots3[2].startAt.toISOString()).toBe("2020-10-15T16:30:00.000Z")
		expect(slots3[3].startAt.toISOString()).toBe("2020-10-15T16:45:00.000Z")
	})
	it("should handle properly minAvailableTimeBeforeSlot parameter", () => {
		MockDate.set(new Date("2020-10-14T15:00:00.000+02:00"))
		const slots = getAvailableTimeSlotsInCalendar({
			calendarData: iCalData,
			configuration: {
				...baseConfig,
				minAvailableTimeBeforeSlot: 10,
			},
			from: new Date("2020-10-16T15:00:00.000+02:00"),
			to: new Date("2020-10-16T16:00:00.000+02:00"),
		})
		expect(slots.length).toBe(2)
		expect(slots[0].startAt.toString())
			.toBe(new Date("2020-10-16T15:10:00.000+02:00").toString())
		expect(slots[1].startAt.toString())
			.toBe(new Date("2020-10-16T15:35:00.000+02:00").toString())

		const slots2 = getAvailableTimeSlotsInCalendar({
			calendarData: iCalData,
			configuration: {
				...baseConfig,
				minAvailableTimeBeforeSlot: 10,
			},
			from: new Date("2020-10-16T15:10:00.000+02:00"),
			to: new Date("2020-10-16T16:00:00.000+02:00"),
		})
		expect(slots2.length).toBe(2)
		expect(slots2[0].startAt.toString())
			.toBe(new Date("2020-10-16T15:10:00.000+02:00").toString())
		expect(slots2[1].startAt.toString())
			.toBe(new Date("2020-10-16T15:35:00.000+02:00").toString())
	})
	it("should handle properly minAvailableTimeAfterSlot parameter", () => {
		MockDate.set(new Date("2020-10-14T15:00:00.000+02:00"))
		const slots = getAvailableTimeSlotsInCalendar({
			calendarData: iCalData,
			configuration: {
				...baseConfig,
				minAvailableTimeAfterSlot: 10,
			},
			from: new Date("2020-10-16T15:00:00.000+02:00"),
			to: new Date("2020-10-16T16:00:00.000+02:00"),
		})
		expect(slots.length).toBe(2)
		expect(slots[0].startAt.toString())
			.toBe(new Date("2020-10-16T15:00:00.000+02:00").toString())
		expect(slots[1].startAt.toString())
			.toBe(new Date("2020-10-16T15:25:00.000+02:00").toString())

		const slots2 = getAvailableTimeSlotsInCalendar({
			calendarData: iCalData,
			configuration: {
				...baseConfig,
				minAvailableTimeAfterSlot: 10,
			},
			from: new Date("2020-10-16T15:15:00.000+02:00"),
			to: new Date("2020-10-16T16:00:00.000+02:00"),
		})
		expect(slots2.length).toBe(1)
		expect(slots2[0].startAt.toString())
			.toBe(new Date("2020-10-16T15:15:00.000+02:00").toString())
	})
	it("should handle properly minTimeBeforeFirstSlot parameter", () => {
		MockDate.set(new Date("2020-10-16T14:00:00.000+02:00"))
		const slots = getAvailableTimeSlotsInCalendar({
			configuration: {
				...baseConfig,
				minTimeBeforeFirstSlot: 2 * 60,
			},
			from: new Date("2020-10-16T15:00:00.000+02:00"),
			to: new Date("2020-10-16T18:00:00.000+02:00"),
		})
		expect(slots.length).toBeGreaterThanOrEqual(1)
		expect(slots[0].startAt.toString())
			.toBe(new Date("2020-10-16T16:00:00.000+02:00").toString())
	})
	it("should handle properly maxDaysBeforeLastSlot parameter", () => {
		MockDate.set(new Date("2020-10-15T18:00:00.000+02:00"))
		const slots = getAvailableTimeSlotsInCalendar({
			configuration: {
				...baseConfig,
				maxDaysBeforeLastSlot: 1,
			},
			from: new Date("2020-10-16T19:00:00.000+02:00"),
			to: new Date("2020-10-17T11:00:00.000+02:00"),
		})
		expect(slots.length).toBe(4)
		expect(slots[3].startAt.toString())
			.toBe(new Date("2020-10-16T19:45:00.000+02:00").toString())
	})
	it("should handle properly timeZone parameter", () => {
		MockDate.set(new Date("2020-10-15T18:00:00.000+02:00"))
		const slots = getAvailableTimeSlotsInCalendar({
			configuration: {
				...baseConfig,
				timeZone: "UTC",
			},
			from: new Date("2020-10-16T20:00:00.000+02:00"),
			to: new Date("2020-10-16T23:00:00.000+02:00"),
		})
		expect(slots.length).toBe(8)
		expect(slots[7].startAt.toString())
			.toBe(new Date("2020-10-16T19:45:00.000Z").toString())
	})
	it("should handle properly availablePeriods parameter", () => {
		MockDate.set(new Date("2020-10-15T18:00:00.000+02:00"))
		const slots = getAvailableTimeSlotsInCalendar({
			configuration: {
				...baseConfig,
				availablePeriods: [{
					isoWeekDay: 5,
					shifts: [
						{ startTime: "12:00", endTime: "13:00" },
						{ startTime: "15:00", endTime: "16:00" },
					]
				}]
			},
			from: new Date("2020-10-16T00:00:00.000+02:00"),
			to: new Date("2020-10-16T23:59:59.999+02:00"),
		})
		expect(slots.length).toBe(8)
		expect(slots[0].startAt.toString())
			.toBe(new Date("2020-10-16T12:00:00.000+02:00").toString())
		expect(slots[4].startAt.toString())
			.toBe(new Date("2020-10-16T15:00:00.000+02:00").toString())

		const slots2 = getAvailableTimeSlotsInCalendar({
			configuration: {
				...baseConfig,
				availablePeriods: [{
					isoWeekDay: 4,
					shifts: [
						{ startTime: "12:00", endTime: "13:00" },
						{ startTime: "15:00", endTime: "16:00" },
					]
				}]
			},
			from: new Date("2020-10-16T00:00:00.000+02:00"),
			to: new Date("2020-10-16T23:59:59.999+02:00"),
		})
		expect(slots2.length).toBe(0)
	})
	it("should handle properly unavailablePeriods parameter", () => {
		MockDate.set(new Date("2020-10-15T18:00:00.000+02:00"))
		const slots = getAvailableTimeSlotsInCalendar({
			configuration: {
				...baseConfig,
				unavailablePeriods: [{ startAt: "2020-10-16 12:30", endAt: "2020-10-16 14:00" }],
			},
			from: new Date("2020-10-16T11:30:00.000+02:00"),
			to: new Date("2020-10-16T15:00:00.000+02:00"),
		})
		expect(slots.length).toBe(8)
		expect(slots[0].startAt.toString())
			.toBe(new Date("2020-10-16T11:30:00.000+02:00").toString())
		expect(slots[3].endAt.toString())
			.toBe(new Date("2020-10-16T12:30:00.000+02:00").toString())
		expect(slots[4].startAt.toString())
			.toBe(new Date("2020-10-16T14:00:00.000+02:00").toString())
		expect(slots[7].startAt.toString())
			.toBe(new Date("2020-10-16T14:45:00.000+02:00").toString())

		const slots2 = getAvailableTimeSlotsInCalendar({
			configuration: {
				...baseConfig,
				unavailablePeriods: [{ startAt: "2019-10-16 12:30", endAt: "2019-10-16 14:00" }],
			},
			from: new Date("2020-10-16T11:30:00.000+02:00"),
			to: new Date("2020-10-16T15:00:00.000+02:00"),
		})
		expect(slots2.length).toBe(14)

		const slots3 = getAvailableTimeSlotsInCalendar({
			configuration: {
				...baseConfig,
				unavailablePeriods: [{ startAt: "10-16 12:30", endAt: "10-16 14:00" }],
			},
			from: new Date("2020-10-16T11:30:00.000+02:00"),
			to: new Date("2020-10-16T15:00:00.000+02:00"),
		})
		expect(slots3.length).toBe(8)
		expect(slots3[0].startAt.toString())
			.toBe(new Date("2020-10-16T11:30:00.000+02:00").toString())
		expect(slots3[7].startAt.toString())
			.toBe(new Date("2020-10-16T14:45:00.000+02:00").toString())
	})
	it("should throw for invalid from and/or to parameters", () => {
		expect(() => getAvailableTimeSlotsInCalendar({
			configuration: baseConfig,
			from: new Date("2020-10-16T18:30:00.000+02:00"),
			to: new Date("2020-10-16T15:00:00.000+02:00"),
		})).toThrowError(new TimeSlotsFinderError(("Invalid boundaries for the search")))
	})
	it(`should properly overlap minAvailableTimeBeforeSlot and minAvailableTimeAfterSlot`, () => {
		MockDate.set(new Date("2020-10-14T15:00:00.000+02:00"))
		const slots = getAvailableTimeSlotsInCalendar({
			configuration: {
				...baseConfig,
				minAvailableTimeBeforeSlot: 10,
				minAvailableTimeAfterSlot: 15,
			},
			from: new Date("2020-10-16T15:00:00.000+02:00"),
			to: new Date("2020-10-16T17:00:00.000+02:00"),
		})
		expect(slots.length).toBe(4)
		expect(slots[0].startAt.toString())
			.toBe(new Date("2020-10-16T15:00:00.000+02:00").toString())
		expect(slots[1].startAt.toString())
			.toBe(new Date("2020-10-16T15:30:00.000+02:00").toString())
		expect(slots[2].startAt.toString())
			.toBe(new Date("2020-10-16T16:00:00.000+02:00").toString())
		expect(slots[3].startAt.toString())
			.toBe(new Date("2020-10-16T16:30:00.000+02:00").toString())
	})
})
