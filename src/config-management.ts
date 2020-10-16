import dayjs from "dayjs"
import { TimeSlotsFinderError } from "./errors"
import { Period, Shift, TimeSlotsFinderConfiguration, WorkedPeriod } from "./types"

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
	if (!Array.isArray(configuration.workedPeriods)) {
		throw new TimeSlotsFinderError("A list of worked periods is expected")
	}
	for (let i = 0; i < configuration.workedPeriods.length; i += 1) {
		_isWorkedPeriodValid(configuration.workedPeriods[i], i)
	}

	/* Unworked periods */
	if (configuration.unworkedPeriods != null && !Array.isArray(configuration.unworkedPeriods)) {
		throw new TimeSlotsFinderError("A list of unworked periods is expected")
	}
	if (configuration.unworkedPeriods) {
		for (let i = 0; i < configuration.unworkedPeriods.length; i += 1) {
			if (!_isUnworkedShiftValid(configuration.unworkedPeriods[i])) {
				throw new TimeSlotsFinderError(`Unworked period nº${i + 1} is invalid`)
			}
		}
	}
	return true
}

function _checkPrimitiveValue(configuration: TimeSlotsFinderConfiguration): boolean {
	if (configuration.timeSlotDuration == null || configuration.timeSlotDuration < 1) {
		throw new TimeSlotsFinderError(`Appointment duration must be at least 1 minute`)
	}
	if (!_nullOrGreaterThanOrEqualTo(0, configuration.minAvailableTimeBeforeAppointment)) {
		throw new TimeSlotsFinderError(`Time before an appointment must be at least 0 minutes`)
	}
	if (!_nullOrGreaterThanOrEqualTo(0, configuration.minAvailableTimeAfterAppointment)) {
		throw new TimeSlotsFinderError(`Time after an appointment must be at least 0 minutes`)
	}
	if (!_nullOrGreaterThanOrEqualTo(0, configuration.minTimeBeforeFirstAvailability)) {
		throw new TimeSlotsFinderError(`The number of hours before first availability must be 0 or more`)
	}
	if (!_nullOrGreaterThanOrEqualTo(1, configuration.maxDaysBeforeLastAvailability)) {
		throw new TimeSlotsFinderError(`The number of days before latest availability must be at least 1`)
	}
	try {
		dayjs().tz(configuration.timeZone)
	} catch (_) {
		throw new TimeSlotsFinderError(`Invalid time zone: ${configuration.timeZone}`)
	}

	const minBeforeFirst = configuration.minTimeBeforeFirstAvailability
	const maxBeforeLast = configuration.maxDaysBeforeLastAvailability
	if (minBeforeFirst && maxBeforeLast && (minBeforeFirst / 24 > maxBeforeLast)) {
		throw new TimeSlotsFinderError(`The first possible appointment will always be after last one possible (see minTimeBeforeFirstAvailability and maxDaysBeforeLastAvailability)`)
	}
	return true
}

function _nullOrGreaterThanOrEqualTo(limit: number, value?: number): boolean {
	return value == null || value >= limit
}

/**
 * Return a reformatted array of workedPeriods without overlapping shifts. Not mutating the
 * originals data.
 * @param {WorkedPeriod[]} workedPeriods The array of workedPeriods to reformat
 * @return {WorkedPeriod[]}
 */
export function _mergeOverlappingShiftsInWorkedPeriods(
	workedPeriods: WorkedPeriod[]
): WorkedPeriod[] {
	return workedPeriods.map((workedPeriod) => ({
		...workedPeriod,
		shifts: _mergeOverlappingShifts(workedPeriod.shifts ?? []),
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
export function _isUnworkedShiftValid(period: Period): boolean {
	return Boolean(
		period
		&& period.startAt
		&& period.endAt
		&& period.startAt.length === period.endAt.length
		&& _isDateStringValid(period.startAt)
		&& _isDateStringValid(period.endAt)
		/* If no year specified, the order can be reversed: the next year will be take for endAt */
		&& (period.startAt.length < 16 || period.startAt.localeCompare(period.endAt) < 0),
	)
}

/**
 * Indicate if a worked period is valid or not. Throws if not valid.
 * @param {WorkedPeriod} workedPeriod The period to check.
 * @param {number} index The index of the worked period in the list.
 * @returns {boolean}
 */
function _isWorkedPeriodValid(workedPeriod: WorkedPeriod, index: number) {
	if (!Number.isInteger(workedPeriod.isoWeekDay)) {
		throw new TimeSlotsFinderError(`ISO Weekday must and integer for work period nº${index + 1}`)
	}
	if (workedPeriod.isoWeekDay < 1 || workedPeriod.isoWeekDay > 7) {
		throw new TimeSlotsFinderError(`ISO Weekday must be contains between 1 (Monday) and 7 (Sunday) for work period nº${index + 1}`)
	}
	for (const shift of workedPeriod.shifts) {
		if (!_isShiftValid(shift)) {
			throw new TimeSlotsFinderError(`Daily shift ${shift.startTime} - ${shift.endTime} for work period nº${index + 1} is invalid`)
		}
	}
	if (_mergeOverlappingShifts(workedPeriod.shifts).length !== workedPeriod.shifts.length) {
		throw new TimeSlotsFinderError(`Some shifts are overlapping for work period nº${index + 1}`)
	}

	return true
}

/**
 * Indicate either if the provided date string is valid or not.
 * @param {string} dateString The date string to check.
 * @returns {boolean}
 */
function _isDateStringValid(dateString: string) {
	const longFormat = "YYYY-MM-DD HH:mm"
	const shortFormat = "MM-DD HH:mm"
	/* Format YYYY-MM-DD HH:mm */
	if (dateString.length === 16) {
		return dayjs(dateString, longFormat, true).format(longFormat) === dateString
	}

	/* Format MM-DD HH:mm */
	if (dateString.length === 11) {
		return dayjs(dateString, shortFormat).format(shortFormat) === dateString
	}

	return false
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
