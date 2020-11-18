import dayjs from "dayjs"
import { TimeSlotsFinderError } from "./errors"
import { Period, Shift, TimeSlotsFinderConfiguration, AvailablePeriod, PeriodMoment } from "./types"

/**
 * Check the validity of a configuration for the time-slots service. If the configuration is
 * invalid, an error will be thrown to describe how it's invalid.
 * @throws {TimeSlotsFinderError}
 * @param {TimeSlotsFinderConfiguration} configuration
 * @return {boolean}
 */
export function isConfigurationValid(configuration: TimeSlotsFinderConfiguration): boolean {
	if (!configuration) {
		throw new TimeSlotsFinderError("No configuration defined")
	}

	/* Primitive values */
	_checkPrimitiveValue(configuration)

	/* Worked periods */
	if (!Array.isArray(configuration.availablePeriods)) {
		throw new TimeSlotsFinderError("A list of available periods is expected")
	}
	for (let i = 0; i < configuration.availablePeriods.length; i += 1) {
		_isAvailablePeriodValid(configuration.availablePeriods[i], i)
	}

	/* Unworked periods */
	if (
		configuration.unavailablePeriods != null
		&& !Array.isArray(configuration.unavailablePeriods)
	) {
		throw new TimeSlotsFinderError("A list of unavailable periods is expected")
	}
	if (configuration.unavailablePeriods) {
		for (let i = 0; i < configuration.unavailablePeriods.length; i += 1) {
			if (!_isUnavailablePeriodValid(configuration.unavailablePeriods[i])) {
				throw new TimeSlotsFinderError(`Unavailable period nº${i + 1} is invalid`)
			}
		}
	}
	return true
}

function _checkPrimitiveValue(configuration: TimeSlotsFinderConfiguration): boolean {
	if (configuration.timeSlotDuration == null || configuration.timeSlotDuration < 1) {
		throw new TimeSlotsFinderError(`Slot duration must be at least 1 minute`)
	}
	if (!_nullOrBetween(1, 30, configuration.slotStartMinuteStep)) {
		throw new TimeSlotsFinderError(`Slot start minute step must be contained between 1 and 30`)
	}
	if (!_nullOrGreaterThanOrEqualTo(0, configuration.minAvailableTimeBeforeSlot)) {
		throw new TimeSlotsFinderError(`Time before a slot must be at least 0 minutes`)
	}
	if (!_nullOrGreaterThanOrEqualTo(0, configuration.minAvailableTimeAfterSlot)) {
		throw new TimeSlotsFinderError(`Time after a slot must be at least 0 minutes`)
	}
	if (!_nullOrGreaterThanOrEqualTo(0, configuration.minTimeBeforeFirstSlot)) {
		throw new TimeSlotsFinderError(`The number of minutes before first slot must be 0 or more`)
	}
	if (!_nullOrGreaterThanOrEqualTo(1, configuration.maxDaysBeforeLastSlot)) {
		throw new TimeSlotsFinderError(`The number of days before latest slot must be at least 1`)
	}
	try {
		dayjs().tz(configuration.timeZone)
	} catch (_) {
		throw new TimeSlotsFinderError(`Invalid time zone: ${configuration.timeZone}`)
	}

	const minBeforeFirst = configuration.minTimeBeforeFirstSlot
	const maxBeforeLast = configuration.maxDaysBeforeLastSlot
	if (minBeforeFirst && maxBeforeLast && (minBeforeFirst / (24 * 60) > maxBeforeLast)) {
		throw new TimeSlotsFinderError(`The first possible slot will always be after last one possible (see minTimeBeforeFirstSlot and maxDaysBeforeLastSlot)`)
	}
	return true
}

function _nullOrGreaterThanOrEqualTo(limit: number, value?: number): boolean {
	return value == null || value >= limit
}
function _nullOrBetween(min: number, max: number, value?: number): boolean {
	return value == null || (value >= min && value <= max)
}

/**
 * Return a reformatted array of availablePeriods without overlapping shifts. Not mutating the
 * originals data.
 * @param {AvailablePeriod[]} availablePeriods The array of availablePeriods to reformat
 * @return {AvailablePeriod[]}
 */
export function _mergeOverlappingShiftsInAvailablePeriods(
	availablePeriods: AvailablePeriod[]
): AvailablePeriod[] {
	return availablePeriods.map((availablePeriod) => ({
		...availablePeriod,
		shifts: _mergeOverlappingShifts(availablePeriod.shifts ?? []),
	}))
}

/**
 * Check the validity of a configuration for the time-slots service.
 * @param {Shift[]} shifts The shifts to refactor into non-overlapping shifts.
 * @returns {Shift[]}
 */
export function _mergeOverlappingShifts(shifts: Shift[]): Shift[] {
	if (shifts.length < 2) {
		return [...shifts]
	}

	const sortedShifts = [...shifts].sort((a, b) => a.startTime.localeCompare(b.startTime))

	for (let i = 0; i < sortedShifts.length - 1; i += 1) {
		if (sortedShifts[i].endTime.localeCompare(sortedShifts[i + 1].startTime) >= 0) {
			if (sortedShifts[i].endTime.localeCompare(sortedShifts[i + 1].endTime) < 0) {
				sortedShifts[i] = {
					startTime: sortedShifts[i].startTime,
					endTime: sortedShifts[i + 1].endTime,
				}
			}
			sortedShifts.splice(i + 1, 1)
			/* Come back 1 element to recheck the same shift against the new next one */
			i -= 1
		}
	}

	return sortedShifts
}

/**
 * Check the validity of a configuration for the time-slots service.
 * @param {Period} period The shifts to refactor into non-overlapping shifts.
 * @returns {boolean}
 */
export function _isUnavailablePeriodValid(period: Period): boolean {
	return Boolean(
		period
		&& period.startAt
		&& period.endAt
		/* Both have year, or both have not */
		&& (period.startAt.year == null) === (period.endAt.year == null)
		&& _isPeriodMomentValid(period.startAt)
		&& _isPeriodMomentValid(period.endAt)
		/* If no year specified, the order can be reversed: the next year will be take for endAt */
		&& (
			period.startAt.year == null
			/* Using the objectSupport DayJS plugin, types are not up to date */
			|| dayjs(period.startAt as never).isBefore(dayjs(period.endAt as never))
		),
	)
}

/**
 * Indicate if a worked period is valid or not. Throws if not valid.
 * @param {AvailablePeriod} availablePeriod The period to check.
 * @param {number} index The index of the worked period in the list.
 * @returns {boolean}
 */
function _isAvailablePeriodValid(availablePeriod: AvailablePeriod, index: number) {
	if (!Number.isInteger(availablePeriod.isoWeekDay)) {
		throw new TimeSlotsFinderError(`ISO Weekday must and integer for available period nº${index + 1}`)
	}
	if (availablePeriod.isoWeekDay < 1 || availablePeriod.isoWeekDay > 7) {
		throw new TimeSlotsFinderError(`ISO Weekday must be contains between 1 (Monday) and 7 (Sunday) for available period nº${index + 1}`)
	}
	for (const shift of availablePeriod.shifts) {
		if (!_isShiftValid(shift)) {
			throw new TimeSlotsFinderError(`Daily shift ${shift.startTime} - ${shift.endTime} for available period nº${index + 1} is invalid`)
		}
	}
	if (_mergeOverlappingShifts(availablePeriod.shifts).length !== availablePeriod.shifts.length) {
		throw new TimeSlotsFinderError(`Some shifts are overlapping for available period nº${index + 1}`)
	}

	return true
}

/**
 * Indicate either if the provided date string is valid or not.
 * @param {PeriodMoment} periodMoment The date string to check.
 * @returns {boolean}
 */
function _isPeriodMomentValid(periodMoment: PeriodMoment) {
	if (periodMoment.hour == null && periodMoment.minute != null) {
		return false
	}

	const isYearAndMonthValid = (
		(periodMoment.year == null || periodMoment.year > 0)
		&& periodMoment.month >= 0 && periodMoment.month <= 11
	)

	if (!isYearAndMonthValid) {
		return false
	}

	/* The day check depends on month and year */
	let day = dayjs().month(periodMoment.month)
	if (periodMoment.year) { day = day.year(periodMoment.year) }
	day = day.date(periodMoment.day)

	const isDayValid = (
		periodMoment.day >= 1 && periodMoment.day <= 31
		&& day.month() === periodMoment.month
	)

	return (
		isDayValid
		&& (periodMoment.hour == null || (periodMoment.hour >= 0 && periodMoment.hour <= 23))
		&& (periodMoment.minute == null || (periodMoment.minute >= 0 && periodMoment.minute <= 59))
	)
}

/**
 * Indicate either if the provided date string is valid or not.
 * @param {Shift} shift The date string to check.
 * @returns {boolean}
 */
function _isShiftValid(shift: Shift) {
	const [startHour, startMinute] = shift.startTime.split(":").map(Number)
	const [endHour, endMinute] = shift.endTime.split(":").map(Number)
	return (
		shift
		&& shift.startTime.match(/^\d{2}:\d{2}$/)
		&& shift.endTime.match(/^\d{2}:\d{2}$/)
		&& startHour >= 0 && startHour <= 23
		&& startMinute >= 0 && startMinute <= 59
		&& endHour >= 0 && endHour <= 23
		&& endMinute >= 0 && endMinute <= 59
		&& shift.endTime.localeCompare(shift.startTime) > 0
	)
}
