/**
 * Image Optimization Utilities
 * Resizes and compresses images using Canvas API before upload
 */

interface ImageDimensions {
    width: number;
    height: number;
}

const MAX_WIDTH = 1280; // Max width for thumbnails
const MAX_HEIGHT = 720; // Max height for thumbnails
const QUALITY = 0.8;    // JPEG quality (0-1)

/**
 * Resizes an image file if it exceeds maximum dimensions
 * @param file Original file
 * @returns Promise resolving to resized Blob or original File if no resizing needed
 */
export const resizeImage = (file: File): Promise<Blob | File> => {
    return new Promise((resolve, reject) => {
        // If not an image, return original
        if (!file.type.startsWith('image/')) {
            resolve(file);
            return;
        }

        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);

            let { width, height } = img;

            // Calculate new dimensions while maintaining aspect ratio
            if (width > MAX_WIDTH || height > MAX_HEIGHT) {
                const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
                width *= ratio;
                height *= ratio;
            } else {
                // Image is small enough, return original
                resolve(file);
                return;
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }

            // Draw resized image
            ctx.drawImage(img, 0, 0, width, height);

            // Convert to Blob
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        console.log(`✓ Image resized: ${file.size} -> ${blob.size} bytes (${width}x${height})`);
                        resolve(blob);
                    } else {
                        reject(new Error('Canvas to Blob failed'));
                    }
                },
                'image/jpeg',
                QUALITY
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image for resizing'));
        };

        img.src = url;
    });
};
