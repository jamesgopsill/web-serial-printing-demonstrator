import type { WebSerialPrinter } from "."

export function evalString(this: WebSerialPrinter, line: string) {
	line = line.trim()
	line = line.replace("\r", "")

	if (line.includes("ok")) {
		// OK to process another piece of gcode
		this._ok = true
	}

	// Update firmware details
	if (line.startsWith("FIRMWARE_NAME")) {
		const firmware = line.match(/(?<=FIRMWARE_NAME:).*(?=SOURCE_CODE_URL)/g)
		console.log(firmware)
		this.firmware.set(firmware[0].trim())
		const sourceCodeUrl = line.match(/(?<=SOURCE_CODE_URL:).*(?=PROTO)/g)
		this.sourceCodeUrl.set(sourceCodeUrl[0].trim())
		const protocolVersion = line.match(
			/(?<=PROTOCOL_VERSION:).*(?=MACHINE_TYPE)/g
		)
		this.protocolVersion.set(protocolVersion[0].trim())
		const machineType = line.match(/(?<=MACHINE_TYPE:).*(?=EXTRUDER_COUNT)/g)
		this.machineType.set(machineType[0].trim())
		const uuid = line.match(/(?<=UUID:).*/g)
		this.uuid.set(uuid[0].trim())
		return
	}

	// Temp report
	if (line.startsWith("ok T") || line.startsWith("T")) {
		const extruderTempActual = line.match(/(?<=T:).*(?=\/)/g)
		this.extruderTempActual.set(parseFloat(extruderTempActual[0].trim()))
		const extruderTempDemand = line.match(/(?<=\/).*(?=B)/g)
		this.extruderTempDemand.set(parseFloat(extruderTempDemand[0].trim()))
		const bedTempActual = line.match(/(?<=B:).*(?=\/)/g)
		this.bedTempActual.set(parseFloat(bedTempActual[0].trim()))
		const bedTempDemand = line.match(/[0-9.\s]+(?=A:)/g)
		this.bedTempDemand.set(parseFloat(bedTempDemand[0].trim()))
		return
	}
}
