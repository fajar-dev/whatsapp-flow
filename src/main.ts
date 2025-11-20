/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Hono } from "hono";
import { decryptRequest, encryptResponse, FlowEndpointException } from "./encryption";
import { getNextScreen } from "./flow";
import crypto from "crypto";
import * as fs from "fs/promises";
import path from "path";

const LOG_DIR = "./logs";

const generateTimestampId = () =>
  new Date().toISOString().replace(/[:.]/g, "-");

async function ensureLogDir() {
  await fs.mkdir(LOG_DIR, { recursive: true });
}

const app = new Hono();

const { APP_SECRET, PRIVATE_KEY, PASSPHRASE = "", PORT = "8023" } = process.env;

interface EncryptedRequestBody {
    encrypted_aes_key: string;
    encrypted_flow_data: string;
    initial_vector: string;
}

function isRequestSignatureValid(
    signature: string | undefined,
    rawBody: string,
    appSecret: string | undefined
): boolean {
    if (!appSecret) {
        console.warn(
        "App Secret is not set up. Please Add your app secret in /.env file to check for request validation"
        );
        return true;
    }

    if (!signature) {
        console.error("Error: No signature header found");
        return false;
    }

    const signatureBuffer = Buffer.from(
        signature.replace("sha256=", ""),
        "utf-8"
    );

    const hmac = crypto.createHmac("sha256", appSecret);
    const digestString = hmac.update(rawBody).digest("hex");
    const digestBuffer = Buffer.from(digestString, "utf-8");

    if (!crypto.timingSafeEqual(digestBuffer, signatureBuffer)) {
        console.error("Error: Request Signature did not match");
        return false;
    }
    return true;
}

app.post("/", async (c) => {
    if (!PRIVATE_KEY) {
        throw new Error(
        'Private key is empty. Please check your env variable "PRIVATE_KEY".'
        );
    }

    await ensureLogDir(); // ⬅️ pastikan folder log ada

    // Get raw body for signature verification
    const rawBody = await c.req.text();
    const signature = c.req.header("x-hub-signature-256");

    if (!isRequestSignatureValid(signature, rawBody, APP_SECRET)) {
        // Return status code 432 if request signature does not match.
        // To learn more about return error codes visit: https://developers.facebook.com/docs/whatsapp/flows/reference/error-codes#endpoint_error_codes
        return new Response(null, { status: 432 });
    }

    // Parse the body
    const body: EncryptedRequestBody = JSON.parse(rawBody);

    let decryptedRequest = null;
    try {
        decryptedRequest = decryptRequest(body, PRIVATE_KEY, PASSPHRASE);
    } catch (err) {
        console.error(err);
        if (err instanceof FlowEndpointException) {
        return new Response(null, { status: err.statusCode });
        }
        return new Response(null, { status: 500 });
    }

    const { aesKeyBuffer, initialVectorBuffer, decryptedBody } = decryptedRequest;
    console.log("💬 Decrypted Request:", decryptedBody);

    const logBaseFile = generateTimestampId();
    const requestLogFile = path.join(LOG_DIR, `${logBaseFile}-request.json`);
    const responseLogFile = path.join(LOG_DIR, `${logBaseFile}-response.json`);

    // simpan REQUEST kalau bukan ping
    if (decryptedBody.action !== "ping") {
        await fs.writeFile(
            requestLogFile,
            JSON.stringify(decryptedBody, null, 2)
        );
    }

    // TODO: Uncomment this block and add your flow token validation logic.
    // If the flow token becomes invalid, return HTTP code 427 to disable the flow and show the message in `error_msg` to the user
    // Refer to the docs for details https://developers.facebook.com/docs/whatsapp/flows/reference/error-codes#endpoint_error_codes

    /*
    if (!isValidFlowToken(decryptedBody.flow_token)) {
        const error_response = {
        error_msg: `The message is no longer available`,
        };
        return c.text(
        encryptResponse(error_response, aesKeyBuffer, initialVectorBuffer),
        427
        );
    }
    */

    const screenResponse = await getNextScreen(decryptedBody);
    console.log("👉 Response to Encrypt:", screenResponse);

    if (decryptedBody.action !== "ping") {
        await fs.writeFile(
            responseLogFile,
            JSON.stringify(screenResponse, null, 2)
        );
    }

    const encryptedResponse = encryptResponse(
        screenResponse,
        aesKeyBuffer,
        initialVectorBuffer
    );

    return new Response(encryptedResponse, { status: 200 });
});

app.get("/", (c) => {
    return new Response(`Nothing to see here.
Checkout README.md to start.`);
});

const port = parseInt(PORT);
console.log(`Server is listening on port: ${port}`);

export default {
    port,
    fetch: app.fetch,
};
