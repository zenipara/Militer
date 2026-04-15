declare module 'html5-qrcode' {
  export interface Html5QrcodeScannerConfig {
    fps?: number;
    qrbox?: number | { width: number; height: number };
  }

  export class Html5QrcodeScanner {
    constructor(elementId: string, config?: Html5QrcodeScannerConfig, verbose?: boolean);
    render(
      successCallback: (decodedText: string) => void,
      errorCallback?: (errorMessage: unknown) => void
    ): void;
    clear(): Promise<void>;
  }
}
