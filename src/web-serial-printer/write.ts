import { get } from "svelte/store"
import type { WebSerialPrinter } from "."

export async function write(this: WebSerialPrinter) {
	while (true) {
		if (this._writer === undefined) break
		if (this.gcode.length > 0 && this._ok) {
			const line = this.gcode.shift()
			this._writer.write(line + "\n")
			if (get(this.debug)) console.log(`Writing: ${line}`)
			this._ok = false
		}
		await this._wait(100)
	}
	return
}
