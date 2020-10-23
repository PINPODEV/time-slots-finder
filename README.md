# Time Slots Finder

![Module Version](https://badgen.net/npm/v/time-slots-finder)
![License](https://badgen.net/npm/license/time-slots-finder)
![Bundle Size](https://badgen.net/bundlephobia/minzip/time-slots-finder)
[![Maintainability](https://api.codeclimate.com/v1/badges/d725b8e849c5cb063866/maintainability)](https://codeclimate.com/repos/5f89a743f73a06460500078a/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/d725b8e849c5cb063866/test_coverage)](https://codeclimate.com/repos/5f89a743f73a06460500078a/test_coverage)

An API to get available time slots. It's possible to provide a calendar
containing existing events.

**Disclaimer**
> This module is currently still in pre-version. Breaking changes may occurs in minor
> versions. Use it with care.

## Features
- Define slots duration
- Require free time before and/or after slots
- Define bookable shifts for day of the week
- Work with or without calendar data
- Handle iCal format for calendar data
- Take time zones in account when parsing calendar and for the configuration
- Includes **TypeScript definitions**
- High test coverage

## Install

```shell script
npm install --save time-slots-finder
```
```shell script
yarn add time-slots-finder
```

## Documentation
### Usage
```typescript
import * as TimeSlotsFinder from "time-slots-finder"

const slots = TimeSlotsFinder.getAvailableTimeSlotsInCalendar({
    calendarData: "SOME ICAL DATA",
    calendarFormat: TimeSlotsFinder.TimeSlotsFinderCalendarFormat.iCal,
    configuration: {
        timeSlotDuration: 15,
        minAvailableTimeBeforeSlot: 5,
        minTimeBeforeFirstSlot: 48,
        availablePeriods: [{
            isoWeekDay: 5,
            shifts: [{ startTime: "10:00", endTime: "20:00" }] 
        }, {
            isoWeekDay: 6,
            shifts: [
                { startTime: "10:00", endTime: "20:00" },
                { startTime: "10:00", endTime: "13:00" },
            ]
        }],
        timeZone: "Europe/Paris",   
    },
    from: new Date("2020-09-21T00:00:00.000+02:00"),
    to: new Date("2020-11-12T23:59:59.999+02:00"),
})

/**
 * This will returns all free time slots between September's 21th and
 * November's 12th, only for all Friday from 10 AM to 8 PM (Paris time) and
 * Satursday from 10 AM to 1 PM. All slots will be 15 minutes long with 5
 * minutes free before each. If we were the 21th of September the first slot
 * would have been on the the 23th (since we require 48 hours before the first
 * availabilities.
 */
```

A **TimeSlot** is represented as follows:
```typescript
{
    /* The start date of the period */
    startAt: Date
    /* The end date of the period */
    endAt: Date
    /* The duration of the slot in minutes */
    duration: number
}
```

### Configuration options

```typescript
/* The length of the time slots in minutes. */
timeSlotDuration: number
```
```typescript
/**
 * A number indicating the step for the start minute of a slot.
 * E.g. if the multiple is 15, slots can only begin at XX:00, XX:15, XX:30 or XX:45.
 * Default value is 5.
 */
slotStartMinuteStep: number
```
```typescript
/* Bookable periods for each day of the week. */
availablePeriods: [{
    isoWeekDay: number, // 1 (Monday) - 7 (Sunday)
    shifts: [{
        startTime: string, // Format "HH:mm"
        endTime: string, // Format "HH:mm"
    }]
}]
```
```typescript
/**
 * Periods where no booking is allowed.
 * 
 * The format of the strings must be `YYYY-MM-DD HH:mm` or `MM-DD HH:mm`. When no
 * year specified, the shift repeats every year.
 * An unavailable period MUST have the same date format for both startAt and endAt.
 */
unavailablePeriods: [{
    startAt: string,
    endAt: string,
}]
```
```typescript
/* The minimum number of free minutes required before a slot. */
minAvailableTimeBeforeSlot: number
```
```typescript
/* The minimum number of free minutes required after a slot. */
minAvailableTimeAfterSlot: number
```
```typescript
/**
 * The minimum number of hours between the time of the search and the first slot
 * returned.
 */
minTimeBeforeFirstSlot: number
```
```typescript
/* The maximum days from now before slots cannot be returned anymore. */
maxDaysBeforeLastSlot: number
```
```typescript
/* The time zone used through all the configuration. */
timeZone: string
```
[See the time zones list here.](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)

### Advanced usage
If you want to check that a configuration is valid without running a search,
 you can use the `isConfigurationValid` function as follows:

```typescript
import * as TimeSlotsFinder from "time-slots-finder"

const config = {
    timeSlotDuration: 15,
    availablePeriods: [{
        isoWeekDay: 5,
        shifts: [{ startTime: "20:00", endTime: "10:00" }] 
    }, {
        isoWeekDay: 6,
        shifts: [
            { startTime: "10:00", endTime: "20:00" },
            { startTime: "10:00", endTime: "13:00" },
        ]
    }],
    timeZone: "Europe/Paris",   
}

try {
    TimeSlotsFinder.isConfigurationValid(config) // returns true is valid
} catch (error) {
    /**
     * Throws error if configuration is invalid.
     * The error indicate why and where the configuration is invalid.
     *
     * Here the error is:
     * "TimeSlotsFinderError: Daily shift 20:00 - 10:00 for work period nº1 is invalid"
     */
}
```

## What's next?
- We consider handling more calendar formats in the future.
- The API may change until the first version (v1.0.0) is released 
