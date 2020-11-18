import dayjs, { Dayjs } from "dayjs"

import {
	_mergeOverlappingShiftsInAvailablePeriods,
	isConfigurationValid
} from "./config-management"
import { extractEventsFromCalendar } from "./events-extractors/extractor"
import { TimeSlotsFinderError } from "./errors"
import {
	DayjsPeriod,
	Period,
	Shift,
	TimeSlot,
	TimeSlotsFinderCalendarFormat,
	TimeSlotsFinderConfiguration
} from "./types"

export interface TimeSlotsFinderParameters {
	/** The calendar data. */
	calendarData?: string
	/** The format of the provided data. */
	calendarFormat?: TimeSlotsFinderCalendarFormat
	/** The configuration specifying the rules used to find availabilities. */
	configuration: TimeSlotsFinderConfiguration
	/** The date from which searching time slots. */
	from: Date
	/** The date to which searching time slots. */
	to: Date
}

/**
 * Extract available time slots from a calendar. Take a configuration to precise rules used to
 * search availabilities. If the configuration provided is invalid, an error will be thrown.
 * @throws TimeSlotsFinderError
 * @param {TimeSlotsFinderParameters} params
 * @return {TimeSlot[]}
 */
export function getAvailableTimeSlotsInCalendar(params: TimeSlotsFinderParameters): TimeSlot[] {
	const { calendarData, configuration, from, to } = params
	const { calendarFormat = TimeSlotsFinderCalendarFormat.iCal } = params

	const usedConfig = _checkSearchParameters(configuration, from, to)
	const { unavailablePeriods, timeZone } = usedConfig

	const eventList = [..._getUnavailablePeriodAsEvents(unavailablePeriods ?? [], timeZone)]
	if (calendarData) {
		eventList.push(...extractEventsFromCalendar(timeZone, calendarFormat, calendarData))
	}

	/* Sort by ascending startAt */
	eventList.sort((eventA, eventB) => eventA.startAt.valueOf() - eventB.startAt.valueOf())

	const { firstFromMoment, lastToMoment } = _computeBoundaries(from, to, usedConfig)

	const timeSlots: TimeSlot[] = []

	let fromMoment = firstFromMoment
	while (fromMoment.isBefore(lastToMoment)) {
		const weekDayConfig = _getWeekDayConfigForMoment(usedConfig, fromMoment)
		if (weekDayConfig) {
			/* Go through each shift of the week day */
			weekDayConfig.shifts.forEach((shift: Shift) => {
				const { startAt, endAt } = _getMomentsFromShift(fromMoment, shift)
				/* Ensure that shift boundaries don't exceed global boundaries */
				const partialFrom = dayjs.max(firstFromMoment, startAt)
				const partialTo = dayjs.min(lastToMoment, endAt)
				if (!partialFrom.isSameOrBefore(partialTo)) {
					/* That may happen when shift boundaries exceed global ones */
					return
				}
				timeSlots.push(
					..._getAvailableTimeSlotsForShift(usedConfig, eventList, partialFrom, partialTo)
				)
			})
		}
		/* Go one day forward: all shifts for this day has been processed (if any) */
		fromMoment = fromMoment.add(1, "day").startOf("day")
	}

	return timeSlots
}

function _checkSearchParameters(
	configuration: TimeSlotsFinderConfiguration,
	from: Date,
	to: Date,
): TimeSlotsFinderConfiguration {
	if (!from || !to || from.getTime() > to.getTime()) {
		throw new TimeSlotsFinderError("Invalid boundaries for the search")
	}

	let usedConfig = configuration
	try {
		const formattedPeriods = _mergeOverlappingShiftsInAvailablePeriods(
			configuration.availablePeriods
		)
		usedConfig = { ...configuration, availablePeriods: formattedPeriods }
	} catch (_) {
		/* If workedPeriods aren't formatted well and provoke an error, the validation will fail */
	}
	/* Don't go further if configuration is invalid */
	isConfigurationValid(usedConfig)
	return usedConfig
}

function _computeBoundaries(from: Date, to: Date, configuration: TimeSlotsFinderConfiguration) {
	const searchLimitMoment = configuration.maxDaysBeforeLastSlot
		? dayjs().tz(configuration.timeZone)
			.add(configuration.maxDaysBeforeLastSlot, "day")
			.endOf("day")
		: null

	const firstFromMoment = dayjs.max(
		dayjs(from).tz(configuration.timeZone),
		dayjs().tz(configuration.timeZone)
			/* `minAvailableTimeBeforeSlot` will be subtract later and it cannot start before now */
			.add(configuration.minAvailableTimeBeforeSlot ?? 0, "minute")
			.add(configuration.minTimeBeforeFirstSlot ?? 0, "minute"),
	)
	const lastToMoment = searchLimitMoment
		? dayjs.min(dayjs(to).tz(configuration.timeZone), searchLimitMoment)
		: dayjs(to).tz(configuration.timeZone)

	return { firstFromMoment, lastToMoment }
}

function _getWeekDayConfigForMoment(
	configuration: TimeSlotsFinderConfiguration,
	searchMoment: Dayjs,
) {
	return (
		configuration.availablePeriods.find((p) => p.isoWeekDay === searchMoment.isoWeekday())
		|| null
	)
}

function _getMomentsFromShift(fromMoment: Dayjs, shift: Shift) {
	let startAt = fromMoment.clone()
	startAt = startAt.hour(parseInt(shift.startTime.slice(0, 2), 10))
	startAt = startAt.minute(parseInt(shift.startTime.slice(3), 10))

	let endAt = fromMoment.clone()
	endAt = endAt.hour(parseInt(shift.endTime.slice(0, 2), 10))
	endAt = endAt.minute(parseInt(shift.endTime.slice(3), 10))

	return { startAt, endAt }
}

function _getAvailableTimeSlotsForShift(
	configuration: TimeSlotsFinderConfiguration,
	eventList: DayjsPeriod[],
	from: Dayjs,
	to: Dayjs,
) {
	const timeSlots: TimeSlot[] = []
	const minTimeWindowNeeded = _getMinTimeWindowNeeded(configuration)
	let searchMoment = from.subtract(configuration.minAvailableTimeBeforeSlot ?? 0, "minute")
	const searchEndMoment = to.subtract(
		configuration.timeSlotDuration + (configuration.minAvailableTimeBeforeSlot ?? 0),
		"minute",
	)
	/* Find index of the first event that is not yet ended at searchMoment */
	let eventIndex = eventList.findIndex((event) => event.endAt.isAfter(searchMoment))
	while (searchMoment.isSameOrBefore(searchEndMoment)) {
		const focusedEvent: DayjsPeriod | null = (eventIndex >= 0 && eventList[eventIndex]) || null
		/* Adjust searchMoment according to the slotStartMinuteMultiple param */
		searchMoment = _nextSearchMoment(searchMoment, configuration)
		const freeTimeLimitMoment = searchMoment.add(minTimeWindowNeeded, "minute")

		if (focusedEvent?.startAt.isBefore(freeTimeLimitMoment)) {
			/**
			 * If first event that is not yet ended start to soon to get a slot at this time,
			 * go directly to the end of the event for next search.
			 */
			searchMoment = focusedEvent.endAt.clone()
			if (focusedEvent) { eventIndex += 1 }
		} else {
			const { newSearchMoment, timeSlot } = _pushNewSlot(searchMoment, configuration)
			timeSlots.push(timeSlot)
			searchMoment = newSearchMoment
		}
	}
	return timeSlots
}

function _getMinTimeWindowNeeded(configuration :TimeSlotsFinderConfiguration) {
	return (
		(configuration.minAvailableTimeBeforeSlot ?? 0)
		+ configuration.timeSlotDuration
		+ (configuration.minAvailableTimeAfterSlot ?? 0)
	)
}

function _pushNewSlot(
	searchMoment: Dayjs,
	configuration: TimeSlotsFinderConfiguration,
): { newSearchMoment: Dayjs, timeSlot: TimeSlot } {
	const startAt = searchMoment
		.add(configuration.minAvailableTimeBeforeSlot ?? 0, "minute")
	const endAt = startAt.add(configuration.timeSlotDuration, "minute")
	const timeSlot = {
		startAt: startAt.toDate(),
		endAt: endAt.toDate(),
		duration: endAt.diff(startAt, "minute"),
	}
	/**
	 * We should start searching after just created slot (including free time after it) but before
	 * next one free time before it (since the search algorithm take it in account).
	 */
	const minutesBeforeNextSearch = Math.max(
		(configuration.minAvailableTimeAfterSlot ?? 0)
		- (configuration.minAvailableTimeBeforeSlot ?? 0),
		0
	)
	return {
		newSearchMoment: endAt
			.add(minutesBeforeNextSearch, "minute"),
		timeSlot
	}
}

function _getUnavailablePeriodAsEvents(unavailablePeriods: Period[], timeZone: string) {
	return unavailablePeriods.map((unavailablePeriod) => {
		/* Transit through string since dayjs.tz with object parsing is bugged */
		const startAtString = dayjs(unavailablePeriod.startAt as never).format("YYYY-MM-DD HH:mm")
		let startAt = dayjs.tz(startAtString, timeZone)
		const endAtString = dayjs(unavailablePeriod.endAt as never).format("YYYY-MM-DD HH:mm")
		let endAt = dayjs.tz(endAtString, timeZone)

		/* If no hours defined, use full days */
		if (unavailablePeriod.startAt.hour == null) {
			startAt = startAt.startOf("day")
		}
		if (unavailablePeriod.endAt.hour == null) {
			endAt = endAt.endOf("day")
		}

		/* Can only happen if no years were defined: push endAt to next year */
		if (endAt.isBefore(startAt)) {
			endAt = endAt.add(1, "year")
		}
		return { startAt, endAt }
	})
}

function _nextSearchMoment(moment: Dayjs, configuration: TimeSlotsFinderConfiguration): Dayjs {
	/* Round up to the next minute if second value is not 0 */
	const nextMoment = moment.second() !== 0
		? moment.startOf("minute").add(1, "minute")
		: moment.clone()
	const slotStartAt = nextMoment.add(configuration.minAvailableTimeBeforeSlot ?? 0, "minute")
	const slotStartMinuteStep = configuration.slotStartMinuteStep ?? 5
	const minuteToAdd = (
		slotStartMinuteStep - (slotStartAt.minute() % slotStartMinuteStep)
	) % slotStartMinuteStep
	return nextMoment.add(minuteToAdd, "minute").millisecond(0)
}
