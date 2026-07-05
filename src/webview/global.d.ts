export {};

declare global {
  interface Window {
    __INITIAL_VIEW__?: string;
    __vscode__?: {
      postMessage: (msg: unknown) => void;
    };
  }
}
