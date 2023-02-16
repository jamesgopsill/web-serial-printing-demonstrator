import type { WebSerialPrinter } from "."

export async function cancelPrint(this: WebSerialPrinter) {
	console.log("CANCELLING THE PRINT")
	const resetLines = [
		"M108 ; interrupts the printer to listen for gcode",
		"G91 ; use relative positioning",
		"M104 S0 ; Turn off extruder heater",
		"M140 S0 ; Turn off bed heater",
		"G1 X0 Y0 Z20 F1000 ; park print head",
		"M107 ; Turn off fan",
		"M84 ; disable motors",
	]
	this.gcode = resetLines
	return
}
