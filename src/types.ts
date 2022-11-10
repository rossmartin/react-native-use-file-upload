export type UploadItem = {
  name: string;
  type: string;
  uri: string;
};

// "T extends UploadItem = UploadItem"
// Generic type parameter that allows passing
// a custom type that inherits UploadItem (constraint).
// It defaults to UploadItem when no type argument is passed.

export type OnProgressData<T extends UploadItem = UploadItem> = {
  item: T;
  event: ProgressEvent<EventTarget>;
};

export type OnDoneData<T extends UploadItem = UploadItem> = {
  item: T;
  responseBody: string;
  responseHeaders: string;
};

export type OnErrorData<T extends UploadItem = UploadItem> = {
  item: T;
  error: string;
  timeout?: boolean;
};

export type FileUploadOptions<T extends UploadItem = UploadItem> = {
  url: string;
  field: string;
  // optional below
  method?: string;
  headers?: Headers;
  timeout?: number;
  onProgress?: (data: OnProgressData<T>) => void;
  onDone?: (data: OnDoneData<T>) => void;
  onError?: (data: OnErrorData<T>) => void;
  onTimeout?: (data: OnErrorData<T>) => void;
};
