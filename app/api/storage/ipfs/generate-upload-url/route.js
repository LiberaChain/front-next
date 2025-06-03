import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { NextResponse } from 'next/server';

/**
 * API handler to generate a pre-signed URL for direct client-side uploads to Filebase.
 * This keeps API keys secure on the server.
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { fileName, fileType } = body;

        if (!fileName || !fileType) {
            return NextResponse.json(
                { message: "fileName and fileType are required." },
                { status: 400 }
            );
        }

        // Use a unique key to prevent filename collisions
        const objectKey = `${randomUUID()}-${fileName}`;

        const command = new PutObjectCommand({
            Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME,
            Key: objectKey,
            ContentType: fileType,
        });

        // Generate the pre-signed URL, which is valid for a short time (e.g., 60 seconds)
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });

        return NextResponse.json({
            uploadUrl: signedUrl,
            objectKey: objectKey
        });

    } catch (error) {
        console.error("Error generating signed URL:", error);
        return NextResponse.json(
            { message: "Failed to generate upload URL." },
            { status: 500 }
        );
    }
}