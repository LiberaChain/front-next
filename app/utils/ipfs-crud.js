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

// CREATE - Upload a file to IPFS-compatible S3
async function uploadFile(fileName, fileContent) {
    const params = {
        Bucket: bucketName,
        Key: fileName,  // The name of the file you're uploading
        Body: fileContent,  // The file content
    };

    try {
        const data = await s3.upload(params).promise();
        console.log('File uploaded successfully:', data.Location);
    } catch (error) {
        console.error('Error uploading file:', error);
    }
}

// READ - Retrieve a file from IPFS-compatible S3
async function getFile(fileName) {
    const params = {
        Bucket: bucketName,
        Key: fileName,
    };

    try {
        const data = await s3.getObject(params).promise();
        console.log('File retrieved successfully:', data.Body.toString());
    } catch (error) {
        console.error('Error retrieving file:', error);
    }
}

// UPDATE - Update an existing file (uploading a new version)
async function updateFile(fileName, newContent) {
    const params = {
        Bucket: bucketName,
        Key: fileName,
        Body: newContent,
    };

    try {
        const data = await s3.upload(params).promise();
        console.log('File updated successfully:', data.Location);
    } catch (error) {
        console.error('Error updating file:', error);
    }
}

// DELETE - Remove a file from IPFS-compatible S3
async function deleteFile(fileName) {
    const params = {
        Bucket: bucketName,
        Key: fileName,
    };

    try {
        await s3.deleteObject(params).promise();
        console.log('File deleted successfully');
    } catch (error) {
        console.error('Error deleting file:', error);
    }
}