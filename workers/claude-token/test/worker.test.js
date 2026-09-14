import { env } from "cloudflare:workers";
import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../src/worker.js";

// Requete "brute" telle qu'un navigateur qui contournerait Cloudflare Access
// enverrait au Worker : aucun en-tete Cf-Access-Jwt-Assertion.
const IncomingRequest = Request;

describe("coffre a jeton Claude", () => {
	it("refuse une requete sans identite Cloudflare Access verifiee", async () => {
		const request = new IncomingRequest("https://claude-token.fvegiard.workers.dev/");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(403);
		expect(await response.text()).toBe(
			"Acces refuse. Identite Cloudflare Access non verifiee.",
		);
	});
});
