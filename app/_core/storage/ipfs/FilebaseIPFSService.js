import { S3Client, ListObjectsV2Command, HeadObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3Config } from '@core/storage/ipfs/s3Config';

/**
 * A utility class for interacting with Filebase's S3-compatible API.
 */
export class FilebaseIPFSProvider {
    /**
     * Initializes a new instance of the FilebaseUtils class.
     * @param {string} accessKeyId - Filebase Access Key ID.
     * @param {string} secretAccessKey - Filebase Secret Access Key.
     * @param {string} bucketName - The name of Filebase bucket.
     * @param {string} [endpoint='https://s3.filebase.com'] - The Filebase S3 API endpoint.
     * @param {string} [region='us-east-1'] - The AWS region for the Filebase S3 API.
     */
    constructor(accessKeyId, secretAccessKey, bucketName, endpoint = 'https://s3.filebase.com', region = 'us-east-1') {
        if (FilebaseIPFSProvider.instance) {
            return FilebaseIPFSProvider.instance;
        }
        FilebaseIPFSProvider.instance = this;

        if (!accessKeyId || !secretAccessKey || !bucketName) {
            throw new Error("Access Key ID, Secret Access Key, and Bucket Name are required.");
        }

        // Initialize the S3 client with credentials and Filebase endpoint
        this.s3Client = new S3Client({
            credentials: {
                accessKeyId: accessKeyId,
                secretAccessKey: secretAccessKey,
            },
            endpoint: endpoint,
            region: region,
            // forcePathStyle: true, // Important for many S3-compatible services like Filebase
        });
        this.bucketName = bucketName;
    }

    async getStatus() {
        const host = await this.getHost();
        const apiPort = await this.getApiPort();
        const gatewayPort = await this.getGatewayPort();

        const isConnected =
            Boolean(process.env.NEXT_PUBLIC_IPFS_HOST) &&
            Boolean(process.env.NEXT_PUBLIC_IPFS_API_PORT) &&
            Boolean(process.env.NEXT_PUBLIC_IPFS_GATEWAY_PORT);

        return {
            connected: isConnected,
            gateway: isConnected ? `https://ipfs.io/` : "None", //`https://${host}:${gatewayPort}` : "None",
            apiEndpoint: isConnected ? `http://${host}:${apiPort}` : "none",
            nodeType: isConnected ? "IPFS Node" : "Local Mock",
            health: isConnected ? "healthy" : "simulated",
            storageCount: isConnected ? null : getLocalStorageItemCount(),
            state: isConnected ? "IPNS Enabled" : "Local Only",
        };
    }

    async getHost() {
        return process.env.NEXT_PUBLIC_IPFS_HOST || "localhost";
    }

    async getApiPort() {
        return process.env.NEXT_PUBLIC_IPFS_API_PORT || "5001";
    }

    async getGatewayPort() {
        return process.env.NEXT_PUBLIC_IPFS_GATEWAY_PORT || "8080";
    }

    /**
     * Lists the contents (files and pseudo-folders) of a specific directory in the Filebase bucket.
     * @param {string} directoryPath - The path of the directory to list (e.g., "myfolder/subfolder/").
     * Pass an empty string "" or "/" to list the root of the bucket.
     * @returns {Promise<Array<Object>>} A promise that resolves to an array of objects.
     * Each object represents a file and contains:
     * { Key: string, LastModified: Date, ETag: string, Size: number, StorageClass: string }
     */
    async listDirectory(directoryPath) {
        let prefix = directoryPath;
        if (prefix && !prefix.endsWith('/')) {
            prefix += '/';
        }
        if (prefix === '/') {
            prefix = '';
        }

        const params = {
            Bucket: this.bucketName,
            Prefix: prefix,
        };

        try {
            const command = new ListObjectsV2Command(params);
            const data = await this.s3Client.send(command);

            const listedContents = [];
            if (data.Contents) {
                data.Contents.forEach(item => {
                    if (item.Key === prefix && item.Size === 0) {
                        return;
                    }
                    listedContents.push({
                        Key: item.Key,
                        LastModified: item.LastModified,
                        ETag: item.ETag,
                        Size: item.Size,
                        StorageClass: item.StorageClass,
                    });
                });
            }
            return listedContents;
        } catch (error) {
            console.error(`Error listing directory "${directoryPath}":`, error);
            throw error;
        }
    }

    /**
     * Gets the latest IPFS CID of a specific file by its path from Filebase.
     * Filebase stores the CID in the 'x-amz-meta-cid' metadata header when objects are uploaded.
     * @param {string} filePath - The full path to the file (e.g., "myfolder/myfile.txt").
     * @returns {Promise<string|null>} A promise that resolves to the IPFS CID string,
     * or null if the file is not found or CID metadata is missing.
     */
    async getLatestCID(filePath) {
        if (!filePath || filePath.endsWith('/')) {
            throw new Error("A valid file path (not a directory path) is required.");
        }

        const params = {
            Bucket: this.bucketName,
            Key: filePath,
        };

        try {
            const command = new HeadObjectCommand(params);
            console.debug(`Fetching metadata for file: ${filePath}`);

            const data = await this.s3Client.send(command);

            console.debug(`Metadata for file "${filePath}":`, data);

            if (data.Metadata && data.Metadata.cid) {
                return data.Metadata.cid;
            } else {
                console.warn(`CID metadata (x-amz-meta-cid) not found for file: ${filePath}. Data:`, data);

                // // For Filebase IPFS objects, the ETag is often the CID (possibly with quotes).
                // // If x-amz-meta-cid is missing, ETag is the next best thing to check.
                // if (data.ETag) {
                //     return data.ETag.replace(/"/g, ''); // Remove quotes if present
                // }

                return null;
            }
        } catch (error) {
            if (error.name === 'NotFound' || (error.$metadata && error.$metadata.httpStatusCode === 404)) {
                console.warn(`File not found on Filebase: ${filePath}`);
                return null;
            }
            console.error(`Error getting CID for file "${filePath}":`, error);
            throw error;
        }
    }

    /**
     * Checks if a file exists in the Filebase bucket.
     * @param {string} filePath - The full path to the file (e.g., "myfolder/myfile.txt").
     * @return {Promise<boolean>} A promise that resolves to true if the file exists, false otherwise.
     * This method uses the HeadObjectCommand to check for existence without downloading the file.
     */
    async fileExists(filePath) {
        if (!filePath || filePath.endsWith('/')) {
            throw new Error("A valid file path (not a directory path) is required.");
        }

        const params = {
            Bucket: this.bucketName,
            Key: filePath,
        };

        try {
            const command = new HeadObjectCommand(params);
            await this.s3Client.send(command);
            return true; // File exists
        } catch (error) {
            if (error.name === 'NotFound' || (error.$metadata && error.$metadata.httpStatusCode === 404)) {
                return false; // File does not exist
            }
            console.error(`Error checking existence of file "${filePath}":`, error);
            throw error; // Re-throw unexpected errors
        }
    }

    async fetchFileByCID(cid) {
        if (!cid) {
            throw new Error("CID is required to fetch the file.");
        }

        const ipfsGateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://ipfs.io/ipfs/';

        try {
            // Construct the URL for the Filebase IPFS gateway
            const url = `${ipfsGateway}${cid}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Failed to fetch file from IPFS. Status: ${response.statusText}`);
            }

            console.debug(`Fetched file with CID "${cid}" successfully from ${url}`, response);

            // Return the response as a Blob or Buffer
            return await response.blob();
        } catch (error) {
            console.error(`Error fetching file with CID "${cid}":`, error);
            throw error;
        }
    }

    /**
     * Uploads (creates or updates) a file to a specific path in the Filebase bucket.
     * @param {string} filePath - The full path for the file in the bucket (e.g., "myfolder/newfile.txt").
     * @param {Buffer|String|ReadableStream} fileContent - The content of the file.
     * @param {string} [contentType='application/octet-stream'] - The MIME type of the file.
     * @returns {Promise<Object>} A promise that resolves to an object containing the ETag (often the CID for Filebase IPFS)
     * and the Key of the uploaded object. Example: { ETag: string, Key: string }
     */
    async uploadFile(filePath, fileContent, contentType = 'application/octet-stream') {
        if (!filePath || filePath.endsWith('/')) {
            throw new Error("A valid file path (not a directory path) is required for uploading.");
        }
        if (fileContent === undefined || fileContent === null) {
            throw new Error("File content cannot be undefined or null.");
        }

        const params = {
            Bucket: this.bucketName,
            Key: filePath,
            Body: fileContent,
            ContentType: contentType,
        };

        try {
            const command = new PutObjectCommand(params);
            const response = await this.s3Client.send(command);

            console.debug(`Uploading file "${filePath}" to Filebase...`, response);

            // For Filebase IPFS objects, the ETag in our case is not the CID.
            // It might be enclosed in double quotes.
            const etag = response.ETag ? response.ETag.replace(/"/g, '') : null;

            console.log(`File uploaded successfully to ${filePath}. ETag: ${etag}`);

            return {
                ETag: etag,
                Key: filePath,
                VersionId: response.VersionId, // If versioning is enabled on the bucket
                $metadata: response.$metadata
            };
        } catch (error) {
            console.error(`Error uploading file "${filePath}":`, error);
            throw error;
        }
    }

    /**
     * Uploads a file or blob to IPFS via the Filebase S3-compatible gateway.
     * This function implements the client-side portion of the upload workflow.
     * Process:
     * 1. Requests a secure pre-signed URL from our Next.js API backend.
     * 2. Uploads the file directly to Filebase using the pre-signed URL.
     * 3. Makes a follow-up request to get the IPFS CID.
     * 4. Returns the CID and a public gateway URL.
     */
    async uploadToIpfsPresigned(file) {
        if (!file) {
            throw new Error("No file or blob provided for upload.");
        }

        try {
            // 1. Get the pre-signed URL from our secure API route
            console.log("1. Requesting pre-signed URL...");
            const presignedUrlResponse = await fetch('/api/storage/ipfs/upload-url', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fileName: file.name || 'data.json',
                    fileType: file.type,
                }),
            });

            if (!presignedUrlResponse.ok) {
                throw new Error("Failed to get a pre-signed URL from the server.");
            }

            const { uploadUrl, objectKey } = await presignedUrlResponse.json();
            console.log("2. Received pre-signed URL and object key");

            // 2. Upload the file directly to Filebase using the pre-signed URL
            console.log("3. Uploading file to Filebase...");
            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                body: file,
                headers: {
                    'Content-Type': file.type,
                },
            });

            if (!uploadResponse.ok) {
                throw new Error(`Failed to upload file to Filebase. Status: ${uploadResponse.statusText}`);
            }
            console.log("4. File uploaded successfully");

            // 3. Get the IPFS CID for the uploaded file
            console.log("5. Retrieving IPFS CID...");
            const cidResponse = await fetch('/api/storage/ipfs/get-cid', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ objectKey }),
            });

            if (!cidResponse.ok) {
                throw new Error("Failed to retrieve IPFS CID");
            }

            const { cid } = await cidResponse.json();
            if (!cid) {
                throw new Error("Could not find IPFS CID in the response.");
            }

            console.log("6. IPFS CID retrieved successfully:", cid);
            return {
                cid: cid,
                url: `https://ipfs.io/ipfs/${cid}`
            };

        } catch (error) {
            console.error("Error in uploadToIpfs:", error);
            throw error;
        }
    }

    /**
     * Deletes a file from a specific path in the Filebase bucket.
     * @param {string} filePath - The full path of the file to delete.
     * @returns {Promise<Object>} A promise that resolves to an object indicating success.
     */
    async deleteFile(filePath) {
        if (!filePath || filePath.endsWith('/')) {
            throw new Error("A valid file path (not a directory path) is required for deletion.");
        }

        const params = {
            Bucket: this.bucketName,
            Key: filePath,
        };

        try {
            const command = new DeleteObjectCommand(params);
            const response = await this.s3Client.send(command);

            // A 204 (No Content) status code indicates a successful deletion.
            if (response.$metadata.httpStatusCode === 204) {
                console.log(`File deleted successfully: ${filePath}`);
                return { success: true, key: filePath, statusCode: response.$metadata.httpStatusCode };
            } else {
                console.warn(`File deletion for ${filePath} completed with an unexpected status code: ${response.$metadata.httpStatusCode}`);
                return { success: false, key: filePath, statusCode: response.$metadata.httpStatusCode };
            }
        } catch (error) {
            console.error(`Error deleting file "${filePath}":`, error);
            throw error;
        }
    }

    static instance = null;

    /**
     * @returns {FilebaseIPFSProvider}
     */
    static getInstance() {
        if (!FilebaseIPFSProvider.instance) {
            const { credentials, bucketName, endpoint, region } = s3Config;
            const { accessKeyId, secretAccessKey } = credentials;
            FilebaseIPFSProvider.instance = new FilebaseIPFSProvider(
                accessKeyId,
                secretAccessKey,
                bucketName,
                endpoint,
                region
            );
        }

        return FilebaseIPFSProvider.instance;
    }
}
