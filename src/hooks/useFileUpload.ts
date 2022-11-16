import { useRef } from 'react';
import type {
  FileUploadOptions,
  OnDoneData,
  OnErrorData,
  UploadItem,
} from '../types';

export default function useFileUpload<T extends UploadItem = UploadItem>({
  url,
  field,
  method = 'POST',
  headers,
  timeout,
  onProgress,
  onDone,
  onError,
  onTimeout,
}: FileUploadOptions<T>) {
  const requests = useRef<{
    [key: string]: XMLHttpRequest;
  }>({});

  const startUpload = (item: T): Promise<OnDoneData<T> | OnErrorData<T>> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append(field, item);

      const xhr = new XMLHttpRequest();

      xhr.open(method, url);

      requests.current[item.uri] = xhr;

      if (xhr.upload) {
        xhr.upload.onprogress = (event: ProgressEvent) => {
          onProgress?.({ item, event });
        };
      }

      if (timeout) {
        xhr.timeout = timeout;
        xhr.ontimeout = () => {
          const result: OnErrorData<T> = {
            item,
            error: xhr.responseText,
            timeout: true,
          };
          onTimeout?.(result);
          reject(result);
        };
      }

      xhr.onload = () => {
        const result: OnDoneData<T> = {
          item,
          responseBody: xhr.response || xhr.responseText,
          responseHeaders: xhr.getAllResponseHeaders(),
        };
        onDone?.(result);
        resolve(result);
      };

      xhr.onerror = () => {
        const result: OnErrorData<T> = {
          item,
          error: xhr.responseText,
        };
        onError?.(result);
        reject(result);
      };

      xhr.onabort = () => {
        const result: OnErrorData<T> = {
          item,
          error: 'Request aborted',
        };
        onError?.(result);
        reject(result);
      };

      headers?.forEach((value: string, key: string) => {
        xhr.setRequestHeader(key, value);
      });

      xhr.send(formData);
    });
  };

  const abortUpload = (uri: string) => {
    requests.current[uri]?.abort();
  };

  return { startUpload, abortUpload };
}
