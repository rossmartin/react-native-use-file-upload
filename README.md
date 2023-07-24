# react-native-use-file-upload

A hook for uploading files using multipart form data with React Native. Provides a simple way to track upload progress, abort an upload, and handle timeouts. Written in TypeScript and no dependencies required.

[![npm version](https://img.shields.io/npm/v/react-native-use-file-upload?style=plastic)](https://www.npmjs.org/package/react-native-use-file-upload)

![example app](example/example.gif)

## Installation

```sh
yarn add react-native-use-file-upload
```

## Example App

There is an example app in this repo as shown in the above gif. It is located within `example` and there is a small node server script within `example/server` [here](example/server/server.ts). You can start the node server within `example` using `yarn server`.

## Usage

```tsx
import useFileUpload, { UploadItem } from 'react-native-use-file-upload';

// Used in optional type parameter for useFileUpload
interface Item extends UploadItem {
  progress?: number;
}

// ...
const [data, setData] = useState<Item[]>([]);
// The generic type param below for useFileUpload is optional
// and defaults to UploadItem. It should inherit UploadItem.
const { startUpload, abortUpload } = useFileUpload<Item>({
  url: 'https://example.com/upload',
  field: 'file',
  // Below options are optional
  method: 'POST',
  headers,
  timeout: 60000,
  onProgress,
  onDone,
  onError,
  onTimeout,
});

const onPressUpload = async () => {
  const promises = data.map((item) => startUpload(item));
  // Use Promise.all instead if you want to throw an error from a timeout or error.
  // As of October 2022 you have to polyfill allSettled in React Native.
  const result = await Promise.allSettled(promises);
};
```

## Methods

### `startUpload`

Start a file upload for a given file. Returns a promise that resolves with `OnDoneData` or rejects with `OnErrorData`.

```ts
// Objects passed to startUpload should have the below shape at least (UploadItem type)
startUpload({
  name: 'file.jpg',
  type: 'image/jpg',
  uri: 'file://some-local-file.jpg',
});
```

### `abortUpload`

Abort a file upload for a given file. The promise from `startUpload` gets rejected and `onError` runs if present.

```ts
// Pass the uri of a file that started uploading
abortUpload('file://some-local-file.jpg');
```

## Options

<table>
<thead>
  <tr>
    <th>Name</th>
    <th>Type</th>
    <th>Required</th>
    <th>Description</th>
  </tr>
</thead>
<tbody>
  <tr>
    <td>url</td>
    <td>string</td>
    <td>Required</td>
    <td>The URL to send the request to.</td>
  </tr>
  <tr>
    <td>field</td>
    <td>string</td>
    <td>Required</td>
    <td>The field name that will be used for the file in FormData.</td>
  </tr>
  <tr>
    <td>method</td>
    <td>string</td>
    <td>Optional</td>
    <td>The HTTP method for the request. Defaults to "POST".</td>
  </tr>
  <tr>
    <td>data</td>
    <td>object</td>
    <td>Optional</td>
    <td>An object of additional FormData fields to be set with the request.</td>
  </tr>
  <tr>
    <td>headers</td>
    <td>Headers</td>
    <td>Optional</td>
<td>Option for passsing in requst headers.

```ts
const headers = new Headers();
headers.append('Authorization', 'foo');
useFileUpload({ headers });
```

</td>

  </tr>
  <tr>
    <td>timeout</td>
    <td>number</td>
    <td>Optional</td>
    <td>The timeout value for the request in milliseconds.</td>
  </tr>
  <tr>
    <td>onProgress</td>
    <td>function</td>
    <td>Optional</td>
<td>Callback when a request times out for a given file. It receives 1 argument of this shape -

```ts
// OnProgressData type
{
  item: UploadItem; // or a type that inherits UploadItem
  event: ProgressEvent;
};
// event is the XMLHttpRequest progress event object and it's shape is -
{
  loaded: number,
  total: number
}
```

</td>
  </tr>
  <tr>
    <td>onDone</td>
    <td>function</td>
    <td>Optional</td>
<td>Callback on request completion for a given file. It receives 1 argument of this shape -

```ts
// OnDoneData type
{
  item: UploadItem; // or a type that inherits UploadItem
  responseBody: string; // eg "{\"foo\":\"baz\"}" (JSON) or "foo"
  responseHeaders: string;
}
```

</td>
  </tr>
  <tr>
    <td>onError</td>
    <td>function</td>
    <td>Optional</td>
<td>Callback when a request error happens for a given file. It receives 1 argument of this shape -

```ts
// onErrorData type
{
  item: UploadItem; // or a type that inherits UploadItem
  error: string;
}
```

</td>
  </tr>
  <tr>
    <td>onTimeout</td>
    <td>function</td>
    <td>Optional</td>
<td>Callback when a request error happens for a given file. It receives 1 argument of this shape -

```ts
// OnErrorData type
{
  item: UploadItem; // or a type that inherits UploadItem
  error: string;
  timeout: boolean; // true here
}
```

</td>
  </tr>
</tbody>
</table>

## FAQs

### Do requests continue when the app is backgrounded?

Requests continue when the app is backgrounded on android but they do not on iOS. This can be addressed by using [react-native-background-upload](https://github.com/Vydia/react-native-background-upload).

The React Native team did a heavy lift to polyfill and bridge `XMLHttpRequest` to the native side for us. [There is an open PR in React Native to allow network requests to run in the background for iOS](https://github.com/facebook/react-native/pull/31838). `react-native-background-upload` is great but if backgrounding can be supported without any external native dependencies it is a win for everyone.

### How can I throttle the file uploads so that I can simulate a real world scenario where upload progress takes time?

You can throttle the file uploads by using [ngrok](https://ngrok.com/) and [Network Link Conditioner](https://developer.apple.com/download/more/?q=Additional%20Tools). Once you have ngrok installed you can start a HTTP tunnel forwarding to the local node server on port 8080 via:

```sh
ngrok http 8080
```

ngrok will generate a forwarding URL to the local node server and you should set this as the `url` for `useFileUpload`. This will make your device/simulator make the requests against the ngrok forwarding URL.

You can throttle your connection using Network Link Conditioner if needed. The existing Wifi profile with a 33 Mbps upload works well and you can add a custom profile also. If your upload speed is faster than 100 Mbps you'll see a difference by throttling with Network Link Conditioner. You might not need to throttle with Network Link Conditioner depending on your connection upload speed.

### Why send 1 file at a time instead of multiple in a single request?

It is possible to to send multiple files in 1 request. There are downsides to this approach though and the main one is that it is slower. A client has the ability to handle multiple server connections simultaneously, allowing the files to stream in parallel. This folds the upload time over on itself.

Another downside is fault tolerance. By splitting the files into separate requests, this strategy allows for a file upload to fail in isolation. If the connection fails for the request, or the file is invalidated by the server, or any other reason, that file upload will fail by itself and won't affect any of the other uploads.

### Why is `type` and `name` required in the `UploadItem` type?

This is because of how React Native abstracts away setting the `content-disposition` request header for us in their polyfill for `FormData`. You can see [here](https://github.com/facebook/react-native/blob/d05a5d15512ab794ef80b31ef91090d5d88b3fcd/Libraries/Network/FormData.js) how that is being done in the `getParts` function.

## License

[MIT](LICENSE.md)

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
