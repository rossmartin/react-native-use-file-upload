export type UploadItem = {
  name: string;
  type: string;
  uri: string;
};

export type OnProgressData = {
  item: UploadItem;
  event: ProgressEvent<EventTarget>;
};

export type OnDoneData = {
  item: UploadItem;
  responseBody: string;
  responseHeaders: string;
};

export type OnErrorData = {
  item: UploadItem;
  error: string;
  timeout?: boolean;
};

export type FileUploadOptions = {
  url: string;
  field: string;
  // optional below
  method?: string;
  headers?: Headers;
  timeout?: number;
  onProgress?: (data: OnProgressData) => void;
  onDone?: (data: OnDoneData) => void;
  onError?: (data: OnErrorData) => void;
  onTimeout?: (data: OnErrorData) => void;
};
