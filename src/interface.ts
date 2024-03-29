import { GetObjectCommandOutput } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

export interface RealGetObjectCommandOutput
  extends Omit<GetObjectCommandOutput, 'Body'> {
  /**
   * The official SDK says the Body has type `Readable | ReadableStream | Blob`,
   * but experimentally, on Nodejs, it is an `IncomingMessage`, which extends
   * `Readable`. We don't care about the other two types because they are not
   * available on Nodejs. We also don't care about the `IncomingMessage` type
   * because it is an internal type and not meant to be used by users. We only
   * care about the `Readable` type. Therefore, we are going to override the
   * type of `Body` to be `Readable` and throw if it doesn't match. 
   */
  Body: Readable;
}

export interface GetObjectParams {
  key: string;
  bucketName: string;
}

export type DeleteObjectParams = GetObjectParams;

export interface PutObjectStreamParams {
  key: string;
  bucketName: string;
  stream: Readable;
}
