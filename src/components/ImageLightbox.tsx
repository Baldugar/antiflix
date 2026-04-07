import { useEffect, useCallback } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Keyboard } from 'swiper/modules';
// @ts-expect-error — CSS imports handled by Vite bundler
import 'swiper/css';
// @ts-expect-error — CSS imports handled by Vite bundler
import 'swiper/css/navigation';

interface ImageLightboxProps {
  images: string[];
  startIndex: number;
  onClose: () => void;
}

export default function ImageLightbox({ images, startIndex, onClose }: ImageLightboxProps) {
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  if (images.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/95 select-none lightbox-swiper"
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl font-mono z-20"
      >
        ✕
      </button>

      <div
        className="w-full h-full"
        onClick={(e) => e.stopPropagation()}
      >
        <Swiper
          modules={[Navigation, Keyboard]}
          initialSlide={startIndex}
          navigation
          keyboard={{ enabled: true }}
          loop={images.length > 1}
          spaceBetween={20}
          className="w-full h-full"
        >
          {images.map((src, i) => (
            <SwiperSlide key={i} className="flex items-center justify-center">
              <div className="flex items-center justify-center w-full h-full p-4">
                <img
                  src={src}
                  alt=""
                  className="max-w-full max-h-full object-contain rounded"
                  draggable={false}
                />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
}
