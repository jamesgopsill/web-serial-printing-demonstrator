import { writable } from "svelte/store"
import { cancelPrint } from "./cancel-print.js"
import { connect } from "./connect.js"
import { disconnect } from "./disconnect.js"
import { evalString } from "./eval-string.js"
import { read } from "./read.js"
import { write } from "./write.js"

export class WebSerialPrinter {
	// External
	public isConnected = writable<boolean>(false)
	public firmware = writable<string>("")
	public sourceCodeUrl = writable<string>("")
	public uuid = writable<string>("")
	public protocolVersion = writable<string>("")
	public machineType = writable<string>("")
	public extruderTempActual = writable<number>(0)
	public extruderTempDemand = writable<number>(0)
	public bedTempActual = writable<number>(0)
	public bedTempDemand = writable<number>(0)
	public baud = writable<number>(115200)
	public cancelling = writable<boolean>(false)
	public debug = writable<boolean>(true)

	public gcode: string[] = []

	protected _port: any = undefined
	protected _writer: WritableStreamDefaultWriter = undefined
	protected _reader: ReadableStreamDefaultReader = undefined
	protected _ok: boolean = true
	protected _writableStreamClosed: Promise<void>
	protected _readableStreamClosed: any

	constructor() {}

	public connect = connect
	public disconnect = disconnect
	public cancelPrint = cancelPrint

	protected _read = read
	protected _write = write
	protected _evalString = evalString
	protected _wait = (ms: number) => new Promise((r, _) => setTimeout(r, ms))
}
