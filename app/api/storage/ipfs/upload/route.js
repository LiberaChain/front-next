import { NextResponse } from 'next/server';
import { } from '../FilebaseService'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Config } from '@core/storage/ipfs/s3Config';

export async function POST(request) {
    try {
        const data = await request.json();
        const client = new S3Client(s3Config);

        // Generate a unique object key/filename
        const objectKey = `posts/${Date.now()}-${Math.random().toString(36).substring(7)}.json`;

        const command = new PutObjectCommand({
            Bucket: s3Config.bucketName,
            Key: objectKey,
            Body: JSON.stringify(data),
            ContentType: 'application/json'
        });

        await client.send(command);

        return NextResponse.json({
            success: true,
            cid: objectKey // Using the object key as the CID
        });
    } catch (error) {
        console.error('Error uploading to S3:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}