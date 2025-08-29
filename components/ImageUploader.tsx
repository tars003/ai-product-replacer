
import React, { useCallback } from 'react';
import type { ImageFile } from '../types';
import { UploadIcon } from './IconComponents';

interface ImageUploaderProps {
    onFilesSelect: (files: ImageFile[]) => void;
    multiple: boolean;
    disabled?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onFilesSelect, multiple, disabled = false }) => {
    const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            const fileArray = Array.from(files);
            const imageFilePromises = fileArray.map(file => {
                return new Promise<ImageFile>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        resolve({ file, base64: reader.result as string });
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            });

            Promise.all(imageFilePromises).then(onFilesSelect);
        }
    }, [onFilesSelect]);

    return (
        <div className={`relative block w-full border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 ${
            disabled 
                ? 'border-gray-600 bg-gray-800 cursor-not-allowed' 
                : 'border-gray-500 hover:border-cyan-400 bg-gray-800/50 hover:bg-gray-700/50'
        }`}>
            <div className="flex flex-col items-center">
                <UploadIcon className={`mx-auto h-12 w-12 ${disabled ? 'text-gray-500' : 'text-gray-400'}`} />
                <span className={`mt-2 block text-sm font-semibold ${disabled ? 'text-gray-500' : 'text-gray-300'}`}>
                    { multiple ? 'Click to upload files' : 'Click to upload a file' }
                </span>
                <span className={`mt-1 block text-xs ${disabled ? 'text-gray-600' : 'text-gray-500'}`}>
                    PNG, JPG, GIF up to 10MB
                </span>
            </div>
            <input
                type="file"
                className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileChange}
                accept="image/png, image/jpeg, image/gif"
                multiple={multiple}
                disabled={disabled}
            />
        </div>
    );
};
