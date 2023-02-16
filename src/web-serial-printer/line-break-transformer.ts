export class LineBreakTransformer {
	private chunks: string = ""
	constructor() {}
	transform(chunk: string, controller: any) {
		// Append new chunks to existing chunks.
		this.chunks += chunk
		// For each line break, parse the complete lines out.
		const lines = this.chunks.split("\n")
		this.chunks = lines.pop()
		lines.forEach((line) => controller.enqueue(line))
	}
	flush(controller: any) {
		// When the stream is closed, fush any remaining chunks out.
		controller.enqueue(this.chunks)
	}
}
