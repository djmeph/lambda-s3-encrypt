/**
 * This Lambda function encrypts an object in an S3 bucket using the AWS Encryption SDK for JavaScript.
 * The function is triggered by an S3 event, which contains information about the bucket and object.
 * The function retrieves the object from S3, encrypts it, and uploads the encrypted object back to S3.
 * The original object is then deleted.
 * 
 * Environment variables:
 * - KMS_KEY: The AWS KMS key ARN to use for encryption.
 */
import {
    AlgorithmSuiteIdentifier,
    CommitmentPolicy,
    KmsKeyringNode,
    buildClient,
  } from '@aws-crypto/client-node';
  import {
    S3Client,
    GetObjectCommand,
    DeleteObjectCommand,
  } from '@aws-sdk/client-s3';
  import { Upload } from '@aws-sdk/lib-storage';
  import { S3Event } from 'aws-lambda';
  import { Readable, Transform, TransformCallback, pipeline } from 'stream';
  
  import { RealGetObjectCommandOutput } from './interface';
  
  const s3 = new S3Client({ region: process.env.AWS_REGION });
  const awsEncryptionClient = buildClient(
    CommitmentPolicy.REQUIRE_ENCRYPT_ALLOW_DECRYPT
  );

  export const handler = async (event: S3Event): Promise<void> => {
    const bucket = event.Records[0].s3.bucket.name;
    const key = decodeURIComponent(
      event.Records[0].s3.object.key.replace(/\+/g, ' ')
    );
  
    if (key.match(/\.encrypted$/)) {
      console.log(`Object ${key} is already encrypted`);
      return;
    }
  
    try {
      if (!process.env.KMS_KEY) {
        throw new Error('KMS_KEY is not set');
      }
  
      const params = { Bucket: bucket, Key: key };
  
      // Generate encrypted object key
      const encryptedKey = `${key}.encrypted`;
  
      // Get the object stream
      const output = (await s3.send(
        new GetObjectCommand(params)
      )) as RealGetObjectCommandOutput;
  
      if (output.Body && !(output.Body instanceof Readable)) {
        throw new Error('GetObjectCommand returned a non-Readable body');
      }
  
      // Stream the S3 object to an encrypted stream
      const stream = pipeline(
        output.Body,
        awsEncryptionClient.encryptStream(
          new KmsKeyringNode({ generatorKeyId: process.env.KMS_KEY }),
          {
            encryptionContext: { key: encryptedKey },
            suiteId:
              AlgorithmSuiteIdentifier.ALG_AES256_GCM_IV12_TAG16_HKDF_SHA512_COMMIT_KEY,
          }
        ),
        /**
         * lib-storage Upload doesn't seem to recognize the encryption stream's Duplex type,
         * so putting this at the end of the chain transforms the outgoing stream into a Readable
         * recognizable by the Upload class.
         */
        new Transform({
          transform: (
            chunk: Buffer,
            _encoding: BufferEncoding,
            callback: TransformCallback
          ) => callback(null, chunk),
        }),
        (err) => (err ? console.error(err) : null)
      );
  
      // Stream the encrypted object back to S3
      const upload = new Upload({
        client: s3,
        params: {
          Bucket: bucket,
          Key: encryptedKey,
          Body: stream,
        },
      });
  
      console.log('Uploading...');
      upload.on('httpUploadProgress', console.log);
  
      await upload.done();
      console.log('Upload complete');
  
      // Delete the original object
      await s3.send(new DeleteObjectCommand(params));
    } catch (err) {
      console.log(err);
    }
  };
  