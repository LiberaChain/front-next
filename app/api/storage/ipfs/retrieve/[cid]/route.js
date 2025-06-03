import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Config } from '@core/storage/ipfs/s3Config';

export async function GET(request, { params }) {
    try {
        const { cid } = params;
        const client = new S3Client(s3Config);

        const command = new GetObjectCommand({
            Bucket: s3Config.bucketName,
            Key: cid
        });

        const response = await client.send(command);
        const bodyContents = await response.Body.transformToString();

        return NextResponse.json(JSON.parse(bodyContents));
    } catch (error) {
        console.error('Error retrieving from S3:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}