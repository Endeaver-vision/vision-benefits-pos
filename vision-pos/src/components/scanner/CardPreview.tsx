'use client';

import { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface CardPreviewProps {
  frontImage?: string;
  backImage?: string;
  frontAlt?: string;
  backAlt?: string;
  className?: string;
}

export function CardPreview({
  frontImage,
  backImage,
  frontAlt = 'Insurance Card Front',
  backAlt = 'Insurance Card Back',
  className,
}: CardPreviewProps) {
  const [activeCard, setActiveCard] = useState<'front' | 'back'>('front');
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const resetView = () => {
    setRotation(0);
    setZoom(1);
  };

  const currentImage = activeCard === 'front' ? frontImage : backImage;
  const currentAlt = activeCard === 'front' ? frontAlt : backAlt;

  if (!frontImage && !backImage) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-muted rounded-lg p-8',
          className
        )}
      >
        <p className="text-muted-foreground text-sm">No card images available</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Card Toggle */}
      {frontImage && backImage && (
        <div className="flex gap-2">
          <Button
            variant={activeCard === 'front' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setActiveCard('front');
              resetView();
            }}
          >
            Front
          </Button>
          <Button
            variant={activeCard === 'back' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setActiveCard('back');
              resetView();
            }}
          >
            Back
          </Button>
        </div>
      )}

      {/* Image Preview */}
      <div className="relative border rounded-lg overflow-hidden bg-muted/30">
        <div className="aspect-[16/10] relative overflow-hidden">
          {currentImage ? (
            <div
              className="w-full h-full flex items-center justify-center transition-transform duration-200"
              style={{
                transform: `rotate(${rotation}deg) scale(${zoom})`,
              }}
            >
              <img
                src={currentImage}
                alt={currentAlt}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-muted-foreground text-sm">
                {activeCard === 'front' ? 'No front image' : 'No back image'}
              </p>
            </div>
          )}
        </div>

        {/* Controls Overlay */}
        {currentImage && (
          <div className="absolute bottom-2 right-2 flex gap-1 bg-background/80 rounded-md p-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleZoomIn}
              disabled={zoom >= 3}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleRotate}
            >
              <RotateCw className="h-4 w-4" />
            </Button>

            {/* Fullscreen Dialog */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh]">
                <div className="relative">
                  <img
                    src={currentImage}
                    alt={currentAlt}
                    className="w-full h-auto max-h-[80vh] object-contain"
                  />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Image Info */}
      {currentImage && (
        <p className="text-xs text-muted-foreground text-center">
          {activeCard === 'front' ? 'Front of insurance card' : 'Back of insurance card'}
          {zoom !== 1 && ` (${Math.round(zoom * 100)}%)`}
        </p>
      )}
    </div>
  );
}

// Compact version for side-by-side display
export function CardPreviewCompact({
  frontImage,
  backImage,
  frontAlt = 'Insurance Card Front',
  backAlt = 'Insurance Card Back',
  className,
}: CardPreviewProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-3', className)}>
      {/* Front Card */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Front</p>
        <div className="border rounded-lg overflow-hidden bg-muted/30 aspect-[16/10]">
          {frontImage ? (
            <Dialog>
              <DialogTrigger asChild>
                <button className="w-full h-full cursor-zoom-in">
                  <img
                    src={frontImage}
                    alt={frontAlt}
                    className="w-full h-full object-cover"
                  />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <img
                  src={frontImage}
                  alt={frontAlt}
                  className="w-full h-auto"
                />
              </DialogContent>
            </Dialog>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-muted-foreground text-xs">Not uploaded</p>
            </div>
          )}
        </div>
      </div>

      {/* Back Card */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Back</p>
        <div className="border rounded-lg overflow-hidden bg-muted/30 aspect-[16/10]">
          {backImage ? (
            <Dialog>
              <DialogTrigger asChild>
                <button className="w-full h-full cursor-zoom-in">
                  <img
                    src={backImage}
                    alt={backAlt}
                    className="w-full h-full object-cover"
                  />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <img
                  src={backImage}
                  alt={backAlt}
                  className="w-full h-auto"
                />
              </DialogContent>
            </Dialog>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-muted-foreground text-xs">Not uploaded</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
