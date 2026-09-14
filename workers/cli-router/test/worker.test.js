import { env } from "cloudflare:workers";
import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../src/worker.mjs";

const IncomingRequest = Request;

describe("cli-router", () => {
	it("repond 503 tant que ROUTER_READY vaut false (origine router.internal absente)", async () => {
		expect(env.ROUTER_READY).toBe("false");

		const request = new IncomingRequest(
			"https://francis-cli-router.fvegiard.workers.dev/v1/chat/completions",
		);
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(503);
		expect(await response.json()).toEqual({
			error: "Route commissioning in progress",
		});
	});
});
