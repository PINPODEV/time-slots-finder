import { Dayjs } from "dayjs"

export interface Period {
	/**
	 * The moment the shift starts. The format of the string must be `YYYY-MM-DD HH:mm` or
	 * `MM-DD HH:mm`.When no year specified, the shift repeats every year.
	 */
	startAt: string
	/** The moment the shift end. The format MUST BE the same as the startAt property one. */
	endAt: string
}

export interface Shift {
	/** A start time in the `HH:mm` format. */
	startTime: string
	/** An end time in the `HH:mm` format. */
	endTime: string
}

export interface AvailablePeriod {
	/** An ISO weekday (1 for Monday to 7 for Sunday). */
	isoWeekDay: number
	/** A list of shifts for the day. */
	shifts: Shift[]
}

export interface TimeSlotsFinderConfiguration {
	/** Duration of a appointment in minutes. */
	timeSlotDuration: number
	/** The periods where booking is possible in a week. */
	availablePeriods: AvailablePeriod[]
	/** Periods where booking is impossible. Take precedence over workedPeriods. */
	unavailablePeriods?: Period[]
	/** The minimum amount of minutes available before an appointment. */
	minAvailableTimeBeforeSlot?: number
	/** The minimum amount of minutes available after an appointment. */
	minAvailableTimeAfterSlot?: number
	/** The minimum amount of minutes between the time of the booking and the appointment booked. */
	minTimeBeforeFirstSlot?: number
	/** The maximum days in the future before appointments cannot be taken anymore. */
	maxDaysBeforeLastSlot?: number
	/** The timezone used through all the configuration. */
	timeZone: string
}

export interface DayjsPeriod {
	startAt: Dayjs
	endAt: Dayjs
}

export interface DatePeriod {
	startAt: Date
	endAt: Date
}

export interface TimeSlot extends DatePeriod {
	duration: number
}

export enum TimeSlotsFinderCalendarFormat {
	iCal = "iCal"
}
