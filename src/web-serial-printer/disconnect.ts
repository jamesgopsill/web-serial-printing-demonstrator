import type { WebSerialPrinter } from "."

export async function disconnect(this: WebSerialPrinter) {
	if (!this._port) return

	this._reader.cancel()
	await this._readableStreamClosed.catch(() => {
		/* Ignore the error */
	})

	this._writer.close()
	await this._writableStreamClosed

	this._port.close()

	//@ts-expect-error
	if ("serial" in navigator && "forget" in SerialPort.prototype) {
		await this._port.forget()
	}

	this.firmware.set("")
	this.sourceCodeUrl.set("")
	this.protocolVersion.set("")
	this.uuid.set("")
	this.machineType.set("")
	this.isConnected.set(false)
	this._port = undefined
	this._reader = undefined
	this._writer = undefined
	this._readableStreamClosed = undefined
	this._writableStreamClosed = undefined
}

// https://stackoverflow.com/questions/71262432/how-can-i-close-a-web-serial-port-that-ive-piped-through-a-transformstream
