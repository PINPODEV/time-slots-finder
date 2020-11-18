import dayjs from "dayjs"

import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"
import customParseFormat from "dayjs/plugin/customParseFormat"
import isoWeek from "dayjs/plugin/isoWeek"
import isSameOrBefore from "dayjs/plugin/isSameOrBefore"
import minMax from "dayjs/plugin/minMax"
import objectSupport from "dayjs/plugin/objectSupport"

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)
dayjs.extend(isoWeek)
dayjs.extend(isSameOrBefore)
dayjs.extend(minMax)
dayjs.extend(objectSupport)
