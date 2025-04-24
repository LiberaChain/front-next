import { NextResponse } from 'next/server';
import AWS from 'aws-sdk';

// Configure the AWS SDK for S3-compatible IPFS service
const s3 = new AWS.S3({
  endpoint: process.env.NEXT_PUBLIC_S3_ENDPOINT,
  accessKeyId: process.env.NEXT_PUBLIC_S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.NEXT_PUBLIC_S3_SECRET_ACCESS_KEY,
  region: 'us-east-1',
  signatureVersion: 'v4'
});

// Bucket name where files are stored
const bucketName = process.env.NEXT_PUBLIC_S3_BUCKET_NAME;

// GET handler for files and directory listings
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key') || '';

    // If key is empty, list objects in bucket (directory listing)
    if (!key) {
      const listParams = {
        Bucket: bucketName
      };

      const data = await s3.listObjectsV2(listParams).promise();
      return NextResponse.json({ 
        success: true, 
        files: data.Contents.map(item => item.Key)
      });
    } else {
      // If key is provided, get the specific object
      const getParams = {
        Bucket: bucketName,
        Key: key
      };

      const data = await s3.getObject(getParams).promise();
      
      // Return the file content as JSON if it's a JSON file
      if (key.endsWith('.json')) {
        const content = data.Body.toString('utf-8');
        return NextResponse.json(JSON.parse(content));
      } else {
        // Otherwise return as text
        return new NextResponse(data.Body, {
          headers: {
            'Content-Type': data.ContentType || 'application/octet-stream'
          }
        });
      }
    }
  } catch (error) {
    console.error('Error accessing storage:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
}

// POST handler for uploading files
export async function POST(request) {
  try {
    const body = await request.json();
    const { fileName, content } = body;

    if (!fileName || content === undefined) {
      return NextResponse.json({ 
        success: false,
        error: 'fileName and content are required'
      }, { status: 400 });
    }

    const params = {
      Bucket: bucketName,
      Key: fileName,
      Body: content,
      ContentType: 'application/json'
    };

    const data = await s3.upload(params).promise();
    
    return NextResponse.json({ 
      success: true,
      location: data.Location,
      key: data.Key
    });
  } catch (error) {
    console.error('Error uploading to storage:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
}