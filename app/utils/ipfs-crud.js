import AWS from 'aws-sdk';

// Configure the AWS SDK for S3-compatible IPFS service
const s3 = new AWS.S3({
    endpoint: process.env.NEXT_PUBLIC_S3_ENDPOINT,  // Replace with your IPFS endpoint
    accessKeyId: process.env.NEXT_PUBLIC_S3_ACCESS_KEY_ID,  // Replace with your Access Key ID
    secretAccessKey: process.env.NEXT_PUBLIC_S3_SECRET_ACCESS_KEY,  // Replace with your Secret Access Key
    region: 'us-east-1',  // Choose your region
    signatureVersion: 'v4'
});

// Bucket name where you store files
const bucketName = process.env.NEXT_PUBLIC_S3_BUCKET_NAME;

// CREATE - Upload a file to IPFS-compatible S3 via proxy API
export async function uploadFile(fileName, fileContent) {
    try {
        // Use our API route instead of direct S3 access
        const response = await fetch('/api/storage', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fileName,
                content: fileContent
            }),
        });

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to upload file');
        }
        
        console.log('File uploaded successfully:', data.location);
        return data.key; // Return the key/filename
    } catch (error) {
        console.error('Error uploading file:', error);
        return null;
    }
}

// READ - Retrieve a file from IPFS-compatible S3 via proxy API
export async function getFile(fileName) {
    try {
        // Use our API route instead of direct S3 access
        const response = await fetch(`/api/storage?key=${encodeURIComponent(fileName)}`);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error: ${response.status}`);
        }
        
        // If it's a JSON file, we'll get JSON directly
        const data = await response.json();
        console.log('File retrieved successfully');
        return JSON.stringify(data);
    } catch (error) {
        console.error('Error retrieving file:', error);
        return null;
    }
}

// UPDATE - Update an existing file (uploading a new version)
export async function updateFile(fileName, newContent) {
    // For updates, we can just use the same upload function
    return uploadFile(fileName, newContent);
}

// DELETE - Remove a file from IPFS-compatible S3
export async function deleteFile(fileName) {
    const params = {
        Bucket: bucketName,
        Key: fileName,
    };

    try {
        await s3.deleteObject(params).promise();
        console.log('File deleted successfully');
        return true;
    } catch (error) {
        console.error('Error deleting file:', error);
        return false;
    }
}

// Check if a file exists in the S3 bucket
export async function checkFileExists(fileName) {
  const params = {
    Bucket: bucketName,
    Key: fileName,
  };

  try {
    // We use headObject instead of getObject to minimize data transfer
    // It only checks if the object exists and returns metadata
    await s3.headObject(params).promise();
    console.log(`File ${fileName} exists in bucket ${bucketName}`);
    return true;
  } catch (error) {
    if (error.code === 'NotFound') {
      console.log(`File ${fileName} does not exist in bucket ${bucketName}`);
      return false;
    }
    console.error('Error checking if file exists:', error);
    return false;
  }
}

// Check if S3 credentials are available
export const hasS3Credentials = () => {
    return !!(
        process.env.NEXT_PUBLIC_S3_ENDPOINT && 
        process.env.NEXT_PUBLIC_S3_ACCESS_KEY_ID && 
        process.env.NEXT_PUBLIC_S3_SECRET_ACCESS_KEY &&
        process.env.NEXT_PUBLIC_S3_BUCKET_NAME
    );
};

// Get S3 gateway URL for listings
export const getS3Gateway = () => {
    // Return the base URL for our local API proxy instead of the direct S3 endpoint
    return '/api/storage';
};