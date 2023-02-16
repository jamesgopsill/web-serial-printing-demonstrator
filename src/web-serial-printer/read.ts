import { get } from "svelte/store"
import type { WebSerialPrinter } from "."

export async function read(this: WebSerialPrinter) {
	while (true) {
		const { value: line, done } = await this._reader.read()
		if (done) {
			this._reader.releaseLock()
			break
		}
		this._evalString(line)
		if (get(this.debug)) console.log(`Reading: ${line}`)
	}
	return
}
