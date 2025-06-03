import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from 'next/server';
import { s3Config } from '@core/storage/ipfs/s3Config';

// Initialize the S3 client for Filebase
const s3Client = new S3Client(s3Config);

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Attempts to get the IPFS CID with retries
 */
async function getIpfsCidWithRetry(command, maxAttempts = 5, initialDelay = 1000) {
    let attempt = 0;
    let currentDelay = initialDelay;

    while (attempt < maxAttempts) {
        try {
            console.log(`GET-CID: Attempt ${attempt + 1} of ${maxAttempts}`);
            const response = await s3Client.send(command);

            // The IPFS CID should be in either ipfs-hash or cid metadata field
            const cid = response.Metadata?.['ipfs-hash'] || response.Metadata?.['cid'];

            if (cid) {
                console.log(`GET-CID: Successfully retrieved CID on attempt ${attempt + 1}`);
                return cid;
            }

            console.log("GET-CID: No CID found in metadata yet, retrying...");
            await delay(currentDelay);
            currentDelay *= 2; // Exponential backoff
            attempt++;

        } catch (error) {
            if (error.name === 'NoSuchKey' || error.name === 'NotFound') {
                console.log(`GET-CID: Object not found on attempt ${attempt + 1}, retrying...`);
                await delay(currentDelay);
                currentDelay *= 2;
                attempt++;
                continue;
            }
            throw error;
        }
    }

    return null;
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { objectKey } = body;

        console.log("GET-CID: Received request for objectKey:", objectKey);

        if (!objectKey) {
            console.log("GET-CID: No objectKey provided in request");
            return NextResponse.json(
                { message: "objectKey is required." },
                { status: 400 }
            );
        }

        // Log S3 configuration
        console.log("GET-CID: Using bucket:", process.env.NEXT_PUBLIC_S3_BUCKET_NAME);
        console.log("GET-CID: Using endpoint:", process.env.NEXT_PUBLIC_S3_ENDPOINT);

        // Create the HeadObject command
        const command = new HeadObjectCommand({
            Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME,
            Key: objectKey,
        });

        // Try to get the CID with retries
        const cid = await getIpfsCidWithRetry(command);

        if (!cid) {
            return NextResponse.json(
                { message: "IPFS CID not found in object metadata after maximum retries." },
                { status: 404 }
            );
        }

        return NextResponse.json({ cid });

    } catch (error) {
        console.error("GET-CID: Error details:", {
            name: error.name,
            message: error.message,
            code: error.$metadata?.httpStatusCode,
            requestId: error.$metadata?.requestId
        });

        // Special handling for common S3 errors
        if (error.name === 'InvalidAccessKeyId' || error.name === 'SignatureDoesNotMatch') {
            return NextResponse.json(
                { message: "Invalid Filebase credentials" },
                { status: 401 }
            );
        }

        return NextResponse.json(
            {
                message: "Failed to retrieve IPFS CID.",
                error: error.message
            },
            { status: 500 }
        );
    }
}