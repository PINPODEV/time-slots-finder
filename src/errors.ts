class TimeSlotsFinderError extends Error {

	constructor(message: string) {
		super(message)
		this.name = "TimeSlotsFinderError"
	}

}

export { TimeSlotsFinderError }
