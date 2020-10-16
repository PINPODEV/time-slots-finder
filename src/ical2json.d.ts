declare module "ical2json" {
    declare interface JSONCal {
        [key: string]: unknown
    }

    declare function convert(iCalData: string): JSONCal
    declare function revert(jsonCal: JSONCal): string
}
