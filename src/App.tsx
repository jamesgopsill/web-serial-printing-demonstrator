import {
	ArrowDownOutlined,
	ArrowLeftOutlined,
	ArrowRightOutlined,
	ArrowUpOutlined,
	DownloadOutlined,
	HomeOutlined,
	UploadOutlined,
} from "@ant-design/icons"
import {
	Button,
	Card,
	Col,
	Descriptions,
	Divider,
	Input,
	Layout,
	notification,
	PageHeader,
	Row,
	Space,
	Upload,
} from "antd"
import React, { FC, useRef, useState } from "react"
import "./App.css"
import { gcode as testGcode } from "./helpers/test-gcode"
import { useInterval } from "./helpers/user-interval"

// https://web.dev/serial/
// https://help.prusa3d.com/en/article/prusa-specific-g-codes_112173#m-commands

export const App: FC = () => {
	// States
	const [gcodeString, setGcodeString] = useState<string>("")
	const [baudRate, setBaudRate] = useState<number>(115200)
	const [firmwareVersion, setFirmwareVersion] = useState<string>("")
	const [uuid, setUUID] = useState<string>("")
	const [temperatures, setTemperatures] = useState<{
		hotendActual: string
		hotendTarget: string
		bedActual: string
		bedTarget: string
	}>({
		hotendActual: "-",
		hotendTarget: "-",
		bedActual: "-",
		bedTarget: "-",
	})
	const [fileList, setFileList] = useState<any[]>([])
	const [intervalDelay, setIntervalDelay] = useState<number | null>(null)
	const [status, setStatus] = useState<string>("Not connected")

	// refs
	const writer = useRef<WritableStreamDefaultWriter | null>(null)
	// ok flag from the printer to say it is ok to continue with sending commands
	const ok = useRef<boolean>(true)
	const cancelPrintFlag = useRef<boolean>(false)

	useInterval(() => {
		// Request temperatures
		writer.current?.write("M105\n")
	}, intervalDelay)

	const wait = (ms: number) => new Promise((r, j) => setTimeout(r, ms))

	const onChangeBaudRate = (v: any) => setBaudRate(v.target.value)
	const onChangeGcodeString = (v: any) => setGcodeString(v.target.value)

	const connect = async () => {
		console.log("Getting Printer Information")
		setIntervalDelay(1000)

		if (!("serial" in navigator)) {
			notification["error"]({
				description: "WebSerial Support",
				message: "This browser does not support Web Serial",
			})
			return
		}

		// Request the serial port
		//@ts-ignore
		const port = await navigator.serial
			.requestPort()
			.catch((err: any) => console.log(err))

		console.log(port)
		await port.open({ baudRate: baudRate })

		// Run read loop
		readLoop(port)

		// Configure the write stream
		const textEncoder = new TextEncoderStream()
		const writableStreamClosed = textEncoder.readable.pipeTo(port.writable)
		const w = textEncoder.writable.getWriter()
		writer.current = w

		// Get firmware details
		await w.write("M115\n")

		setStatus("Ready")
	}

	const readLoop = async (port: any) => {
		const decoder = new TextDecoderStream()

		port.readable.pipeTo(decoder.writable)

		const inputStream = decoder.readable
		const reader = inputStream.getReader()

		notification["success"]({
			description: "Your printer is now connected. Let's see what it's up to.",
			message: "Printer Connected",
		})

		let log: string[] = ["", ""]
		while (true) {
			//console.log("Reading the Serial Port")
			const { value, done } = await reader.read()
			if (value) {
				//console.log(value)
				//console.log("\n".indexOf(value))
				const lines = value.split("\n") // split on new line
				let linesAdded = 0
				//@ts-ignore
				log[log.length - 1] += lines.shift() // take the first and append it to the last partial line
				// add the additional elements (in case there are multiple newlines)
				for (const line of lines) {
					linesAdded += 1
					log.push(line)
				}
				// handle recent log entry event (note that -1 could be a partially digested command)
				// there could also be multiple lines in one message
				for (let i = log.length - (linesAdded + 1); i < log.length - 1; i++) {
					handleResponse(log[i])
				}
			} else {
				// no returns in the response so append to last index in log
				console.log("No carriage return in value")
				log[log.length - 1] += value
			}

			// Removing old elements over time.
			if (log.length > 100) {
				//console.log("Compressing Log From:", log.length)
				log.splice(0, log.length - 100)
				//console.log("Compressing Log To:", log.length)
			}

			if (done) {
				console.log("[READING DONE]")
				reader.releaseLock()
				break
			}
		}
	}

	const updateTemperature = (line: string) => {
		const elements = line.split(" ")
		//console.log(elements)
		setTemperatures({
			hotendActual: elements[0].replace("T:", ""),
			hotendTarget: elements[1].replace("/", ""),
			bedActual: elements[2].replace("B:", ""),
			bedTarget: elements[3].replace("/", ""),
		})
	}

	const handleResponse = (line: string) => {
		line = line.trim()
		line = line.replace("\r", "")
		console.log("Response:", line)

		if (line.includes("ok")) {
			// OK to process another piece of gcode
			ok.current = true
		}
		if (line.startsWith("ok T:") || line.startsWith("T:")) {
			updateTemperature(line.replace("ok ", ""))
		}
		if (line.startsWith("FIRMWARE_NAME")) {
			let elements = line.split(" SOURCE_CODE_URL")
			setFirmwareVersion(elements[0].replace("FIRMWARE_NAME:", ""))
			elements = line.split("UUID:")
			setUUID(elements[1])
		}
	}

	const testPrint = () => {
		print(testGcode)
	}

	const printFile = async () => {
		print(await fileList[0].text())
	}

	const print = async (gcode: string) => {
		notification["success"]({
			description: "Whooop!",
			message: "Starting Print",
		})

		// pause requesting for updates
		setIntervalDelay(null)
		cancelPrintFlag.current = false
		setStatus("Printing")
		// wait for the interval to clear (giving plenty of time)
		await wait(2000)

		console.log("Starting Test Print")
		console.log("Printer ready?:", ok.current)

		let gcodeLines = gcode.split("\n")
		for (const line of gcodeLines) {
			if (line == ";End of Gcode") {
				break
			}
			if (cancelPrintFlag.current) break // exit loop
			if (!line.startsWith(";")) {
				// Ignore the comments
				while (true) {
					if (cancelPrintFlag.current) break // exit loop
					// If ok to send then send the command
					if (ok.current) {
						console.log("Sending:", line)
						writer.current?.write(line + "\n")
						ok.current = false // now wait for the response to say it is ok to send again.
						break // breaks the while loop
					}
					await wait(10) // wait 10ms and hope the printer comes back with an ok
				}
			}
		}

		if (cancelPrintFlag.current) {
			console.log("CANCELLING THE PRINT")
			setStatus("Cancelling Print")
			notification["warning"]({
				description: "",
				message: "Print Canceled",
			})
			// Spam the printer until it listens and interrupts whatever the machine is doing
			const resetLines = [
				"M108 ; interrupts the printer to listen for gcode",
				"G91 ; use relative positioning",
				"M104 S0 ; Turn off extruder heater",
				"M140 S0 ; Turn off bed heater",
				"G1 X0 Y0 Z10 F1000 ; park print head",
				"M107 ; Turn off fan",
				"M84 ; disable motors",
			]
			ok.current = true
			for (const line of resetLines) {
				while (true) {
					if (ok.current) {
						console.log("Canceling:", line)
						writer.current?.write(line + "\n")
						ok.current = false
						break
					}
					await wait(10)
				}
			}
			cancelPrintFlag.current = false
			setStatus("Print Canceled")
		}

		notification["success"]({
			description: "Nice one!",
			message: "Printing Finished",
		})

		console.log("Serial Print Complete")
		// Return to receiving updates on the printer temps.
		setIntervalDelay(1000)
	}

	const submitGcode = async () => {
		console.log("Submitting:", gcodeString)
		if (ok.current) {
			writer.current?.write(gcodeString + "\n")
			ok.current = false
		}
	}

	const beforeUpload = async (file: any) => {
		// Add the file to the file list
		if (file.name.indexOf(".gcode") < 0) {
			notification["error"]({
				description: "Upload",
				message: "Invalid File Type",
			})
			setFileList([])
			return Upload.LIST_IGNORE
		}

		//@ts-ignore
		if (
			file.name.indexOf(".gcode.gz") > -1 &&
			typeof DecompressionStream != "function"
		) {
			notification["error"]({
				description: "Upload",
				message: "Google Chrome required for gzip gcode upload",
			})
			setFileList([])
			return Upload.LIST_IGNORE
		}

		setFileList([file])
		return false // Return false we went to handle the file upload manually
	}

	const onRemove = (file: any) => {
		setFileList((fL) => {
			const index = fL.indexOf(file)
			const nFL = fL.slice()
			nFL.splice(index, 1)
			return nFL
		})
	}

	return (
		<React.Fragment>
			<Layout.Content
				style={{ marginLeft: 25, marginRight: 25, marginBottom: 10 }}
			>
				<PageHeader
					title="3D Printing over Web Serial"
					subTitle={
						<React.Fragment>
							Works on{" "}
							<a href="https://www.google.com/intl/en_uk/chrome/">
								Google Chrome
							</a>{" "}
							and tested using a{" "}
							<a href="https://www.prusa3d.com/product/original-prusa-mini-semi-assembled-3d-printer-4/">
								Prusa Mini
							</a>
							.
						</React.Fragment>
					}
					extra={
						<iframe
							src="https://github.com/sponsors/jamesgopsill/button"
							title="Sponsor jamesgopsill"
							height="35"
							width="116"
							style={{ border: 0 }}
						></iframe>
					}
				/>
				<Row justify="space-around">
					<Col span={16}>
						<Card>
							<Descriptions
								title="Printer Details"
								size="small"
								column={1}
								extra={
									<Space>
										Baud Rate:
										<Input
											placeholder="Set BaudRate"
											type="number"
											value={baudRate}
											onChange={onChangeBaudRate}
										/>
										<Button type="primary" onClick={connect}>
											Connect
										</Button>
									</Space>
								}
							>
								<Descriptions.Item label="Status">{status}</Descriptions.Item>
								<Descriptions.Item label="Firmware">
									{firmwareVersion}
								</Descriptions.Item>
								<Descriptions.Item label="UUID">{uuid}</Descriptions.Item>
								<Descriptions.Item label="Hotend">
									{temperatures.hotendActual} | {temperatures.hotendTarget}{" "}
									&#8451;
								</Descriptions.Item>
								<Descriptions.Item label="Bed">
									{temperatures.bedActual} | {temperatures.bedTarget} &#8451;
								</Descriptions.Item>
							</Descriptions>
							<Divider />
							<h2>Send G-Code</h2>
							<p>Jog the print head</p>
							<Space style={{ marginBottom: 10 }}>
								<Button
									type="primary"
									onClick={() => {
										if (ok.current) {
											writer.current?.write("G28\n")
											ok.current = false
										}
									}}
								>
									<HomeOutlined />
								</Button>
								<Button
									type="primary"
									onClick={() => {
										if (ok.current) {
											writer.current?.write("G91\nG1 X-1\n")
											ok.current = false
										}
									}}
								>
									<ArrowLeftOutlined />
								</Button>
								<Button
									type="primary"
									onClick={() => {
										if (ok.current) {
											writer.current?.write("G91\nG1 Y1\n")
											ok.current = false
										}
									}}
								>
									<ArrowUpOutlined />
								</Button>
								<Button
									type="primary"
									onClick={() => {
										if (ok.current) {
											writer.current?.write("G91\nG1 Y-1\n")
											ok.current = false
										}
									}}
								>
									<ArrowDownOutlined />
								</Button>
								<Button
									type="primary"
									onClick={() => {
										if (ok.current) {
											writer.current?.write("G91\nG1 X1\n")
											ok.current = false
										}
									}}
								>
									<ArrowRightOutlined />
								</Button>
								<Button
									type="primary"
									onClick={() => {
										if (ok.current) {
											writer.current?.write("G91\nG1 Z1\n")
											ok.current = false
										}
									}}
								>
									<UploadOutlined />
								</Button>
								<Button
									type="primary"
									onClick={() => {
										if (ok.current) {
											writer.current?.write("G91\nG1 Z-1\n")
											ok.current = false
										}
									}}
								>
									<DownloadOutlined />
								</Button>
							</Space>
							<p>Send a single line of g-code to the printer.</p>
							<Space>
								<Input
									placeholder="Send G-Code"
									type="text"
									value={gcodeString}
									onChange={onChangeGcodeString}
								/>
								<Button onClick={submitGcode}>Submit G-Code</Button>
							</Space>
							<Divider />
							<h2>Test Print</h2>
							<p>Print a 20mm cube.</p>

							<Button type="primary" onClick={testPrint}>
								Print Test G-Code
							</Button>
							<br />
							<br />
							<h2>Print a File</h2>
							<Upload
								beforeUpload={beforeUpload}
								onRemove={onRemove}
								fileList={fileList}
							>
								<Button>Upload</Button>
							</Upload>
							<br />
							<Button type="primary" onClick={printFile}>
								Print G-Code File
							</Button>
							<br />
							<br />
							<h2>Cancel Print</h2>
							<Button
								danger
								type="primary"
								onClick={() => (cancelPrintFlag.current = true)}
							>
								Cancel Print
							</Button>
							<Divider />
							<p>
								Want to see what is happening? Use the browser's console to see
								the interation with the printer.
							</p>
						</Card>
					</Col>
				</Row>
			</Layout.Content>
			<Layout.Footer>
				<p>
					Created as part of the EPSRC-funded Brokering Additive Manufacturing
					project.
				</p>
			</Layout.Footer>
		</React.Fragment>
	)
}
