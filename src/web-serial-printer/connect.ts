import { get } from "svelte/store"
import type { WebSerialPrinter } from "."
import { LineBreakTransformer } from "./line-break-transformer"

export async function connect(this: WebSerialPrinter) {
	if (!("serial" in navigator)) {
		alert("This browser does not support Web Serial.")
		await this._wait(1)
		this.isConnected.set(false)
		return
	}

	// Request the serial port
	try {
		this._port = await navigator.serial.requestPort()
	} catch (err: any) {
		console.log(err)
		alert("No port selected.")
		this._port = undefined
		this.isConnected.set(false)
		return
	}
	if (!this._port) {
		alert("No port selected.")
		this.isConnected.set(false)
		return
	}

	await this._port.open({ baudRate: get(this.baud) })

	const textDecoder = new TextDecoderStream()
	this._readableStreamClosed = this._port.readable.pipeTo(textDecoder.writable)
	const reader = textDecoder.readable
		.pipeThrough(new TransformStream(new LineBreakTransformer()))
		.getReader()
	this._reader = reader

	this._read()

	const encoder = new TextEncoderStream()
	this._writableStreamClosed = encoder.readable.pipeTo(this._port.writable)
	this._writer = encoder.writable.getWriter()

	this._write()
	this.gcode.push("M115", "M155 S1")
	return
}
