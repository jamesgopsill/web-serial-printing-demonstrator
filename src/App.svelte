<script lang="ts">
	import {
		Button,
		FormGroup,
		Icon,
		Input,
		InputGroup,
		InputGroupText,
		Navbar,
		NavbarBrand,
	} from "sveltestrap"
	import { WebSerialPrinter } from "./web-serial-printer"

	let printer = new WebSerialPrinter()
	let {
		isConnected,
		baud,
		firmware,
		sourceCodeUrl,
		protocolVersion,
		uuid,
		machineType,
		extruderTempActual,
		extruderTempDemand,
		bedTempActual,
		bedTempDemand,
		debug,
	} = printer
	let files: any

	const submit = () => {
		if (files) {
			const reader = new FileReader()
			reader.onload = function (event) {
				//@ts-ignore
				let g: string = event.target.result
				const lines = g.split("\n")
				lines.map((line: string) => {
					if (!line.startsWith(";") && line) printer.gcode.push(line)
				})
			}
			reader.readAsText(files[0])
		}
	}

	const cancel = () => {
		printer.cancelPrint()
	}

	$: {
		console.log($isConnected)
		if ($isConnected) {
			printer.connect()
		} else {
			printer.disconnect()
		}
	}
</script>

<Navbar color="light" light={true} expand="md" class="mb-1">
	<NavbarBrand href="#/"
		>BAM Web Serial Printing Demonstrator <small
			>(Requires Chrome/Edge and tested using a Prusa MINI)</small
		></NavbarBrand
	>
</Navbar>

<div class="m-2">
	<InputGroup size="sm">
		<Input type="number" bind:value={$baud} />
		<InputGroupText>
			<Input type="switch" class="mt-1" bind:checked={$isConnected} /> Connect
		</InputGroupText>
	</InputGroup>

	<InputGroup size="sm" class="mt-1">
		<Input type="switch" class="" bind:checked={$debug} /> Print to Console
	</InputGroup>

	<small class="text-muted">
		<ul class="list-inline mb-1 mt-2">
			<li class="list-inline-item">Firmware: {$firmware}</li>
			<li class="list-inline-item">| Source Code URL: {$sourceCodeUrl}</li>
			<li class="list-inline-item">| Protocol Version: {$protocolVersion}</li>
		</ul>
		<ul class="list-inline mb-1">
			<li class="list-inline-item">UUID: {$uuid}</li>
			<li class="list-inline-item">| Machine Type: {$machineType}</li>
		</ul>
		<ul class="list-inline">
			<li class="list-inline-item">
				Extruder Temp: {$extruderTempActual} ({$extruderTempDemand})
			</li>
			<li class="list-inline-item">
				| Bed Temp: {$bedTempActual} ({$bedTempDemand})
			</li>
		</ul>
	</small>

	<FormGroup>
		<Button
			size="sm"
			color="primary"
			disabled={!$isConnected}
			on:click={() => printer.gcode.push("G28")}
			><Icon name="house-fill" /></Button
		>
		<Button
			size="sm"
			color="primary"
			disabled={!$isConnected}
			on:click={() => printer.gcode.push("G91", "G1 X-5")}
		>
			<Icon name="arrow-left" />
		</Button>
		<Button
			size="sm"
			color="primary"
			disabled={!$isConnected}
			on:click={() => printer.gcode.push("G91", "G1 Y5")}
		>
			<Icon name="arrow-up" /></Button
		>
		<Button
			size="sm"
			color="primary"
			disabled={!$isConnected}
			on:click={() => printer.gcode.push("G91", "G1 Y-5")}
		>
			<Icon name="arrow-down" /></Button
		>
		<Button
			size="sm"
			color="primary"
			disabled={!$isConnected}
			on:click={() => printer.gcode.push("G91", "G1 X5")}
		>
			<Icon name="arrow-right" /></Button
		>
		<Button
			size="sm"
			color="primary"
			disabled={!$isConnected}
			on:click={() => printer.gcode.push("G91", "G1 Z5")}
		>
			<Icon name="arrow-bar-up" /></Button
		>
		<Button
			size="sm"
			color="primary"
			disabled={!$isConnected}
			on:click={() => printer.gcode.push("G91", "G1 Z-5")}
		>
			<Icon name="arrow-bar-down" /></Button
		>
	</FormGroup>

	<InputGroup size="sm">
		<input class="form-control" type="file" bind:files />
		<Button size="sm" color="primary" disabled={!$isConnected} on:click={submit}
			>Submit G-Code</Button
		>
		<Button size="sm" color="danger" disabled={!$isConnected} on:click={cancel}
			>Cancel Print</Button
		>
	</InputGroup>
</div>
