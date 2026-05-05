import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {
    const cloudinaryUrl = this.configService.get<string>('CLOUDINARY_URL');
    if (cloudinaryUrl) {
      cloudinary.config({ cloudinary_url: cloudinaryUrl });
      return;
    }

    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');
    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
    }
  }

  async uploadImage(
    buffer: Buffer,
    filename: string,
  ): Promise<{ secureUrl: string; publicId: string }> {
    try {
      return await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'properties',
            resource_type: 'image',
          },
          (error, result) => {
            if (error || !result) {
              return reject(error ?? new Error('Cloudinary upload failed'));
            }

            resolve({
              secureUrl: result.secure_url,
              publicId: result.public_id,
            });
          },
        );

        Readable.from(buffer).pipe(uploadStream);
      });
    } catch (error) {
      throw new InternalServerErrorException('Error al subir la imagen');
    }
  }

  async deleteImage(publicId: string): Promise<void> {
    if (!publicId) {
      return;
    }

    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    } catch (error) {
      throw new InternalServerErrorException('Error al eliminar la imagen');
    }
  }
}
