/// <reference types="vite/client" />

declare module 'vite/types/customEvent' {
  interface CustomEventMap {
    'revideo:meta': {source: string; data: any};
    'revideo:meta-ack': {source: string};
    'revideo:export': {
      data: string;
      subDirectories: string[];
      mimeType: string;
      frame: number;
      sceneFrame?: number;
      groupByScene?: boolean;
    };
    'revideo:export-ack': {frame: number};
    'revideo:assets': {urls: string[]};
  }
}
