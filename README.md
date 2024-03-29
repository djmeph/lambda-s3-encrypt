# Lambda S3 Encrypt Function

This Lambda function encrypts an object in an S3 bucket using the AWS Encryption SDK for JavaScript.<br>
The function is triggered by an S3 event, which contains information about the bucket and object.<br>
The function retrieves the object from S3, encrypts it, and uploads the encrypted object back to S3.<br>
The original object is then deleted.

Usage:

```bash
yarn install
yarn tsc # Outputs to dist/index.js
```

Recommended node.js version: 20.x
