/**
 * DRAPE AR Camera Stream Manager
 *
 * Manages webcam media streams, front/rear camera selection, resolution negotiation,
 * and track disposal conforming to browser privacy standards.
 */

export interface CameraConfig {
  facingMode?: 'user' | 'environment';
  width?: number;
  height?: number;
}

export class CameraManager {
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private currentFacingMode: 'user' | 'environment' = 'user';

  /**
   * Initializes webcam and binds it to the provided HTML5 video element.
   */
  async startCamera(
    video: HTMLVideoElement,
    config: CameraConfig = {}
  ): Promise<{ width: number; height: number; aspect: number }> {
    this.stopCamera();
    this.videoElement = video;
    this.currentFacingMode = config.facingMode || 'user';

    const constraints: MediaStreamConstraints = {
      audio: false,
      video: {
        facingMode: this.currentFacingMode,
        width: { ideal: config.width || 1280 },
        height: { ideal: config.height || 720 },
      },
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = this.stream;
      video.playsInline = true;
      video.muted = true;

      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => {
          video
            .play()
            .then(() => resolve())
            .catch(reject);
        };
        video.onerror = (e) => reject(new Error('Video stream playback error: ' + String(e)));
      });

      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      const aspect = width / height;

      return { width, height, aspect };
    } catch (err: unknown) {
      this.stopCamera();
      const error = err as { name?: string; message?: string };
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        throw new Error('CAMERA_PERMISSION_DENIED');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        throw new Error('CAMERA_NOT_FOUND');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        throw new Error('CAMERA_IN_USE');
      }
      throw new Error(`CAMERA_ERROR: ${error.message || 'Unable to access camera.'}`);
    }
  }

  /**
   * Stops all active video tracks and detaches srcObject.
   */
  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
  }

  /**
   * Toggles between front and rear cameras where supported.
   */
  async switchCamera(): Promise<{ width: number; height: number; aspect: number } | null> {
    if (!this.videoElement) return null;
    const targetMode = this.currentFacingMode === 'user' ? 'environment' : 'user';
    return this.startCamera(this.videoElement, { facingMode: targetMode });
  }

  get isStreaming(): boolean {
    return this.stream !== null && this.stream.active;
  }

  get facingMode(): 'user' | 'environment' {
    return this.currentFacingMode;
  }
}

