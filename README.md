# Stream transformer for nested objects in JSON arrays

> A huge thanks to Say Media, Inc. for the [highland-find-json](https://github.com/saymedia/highland-find-json) package where we could copy most of the code and docs from. They wrote it for [Highland](https://github.com/caolan/highland), we ported it to native Node.js Streams. Their license is MIT and so it ours.

`stream-transform-nested-json` is a library for locating JSON objects in a stream of buffers.

The primary use-case for this library is for dealing with very large (or infinite) streams containing many relatively-small JSON objects, such as JSON-based logging.

It expects as input a stream of buffers, such as would occur if receiving data from a TCP socket or streaming data from any database. It emits another stream of buffers, but in the output each buffer exactly frames a JSON object from the input stream.

For example, imagine the following buffers show up in an HTTP response:

- `[{"user":"`
- `bert"},{"user`
- `":null}]`

`stream-transform-nested-json` would consume the above and produce a stream with two buffers as follows:

- `{"user":"bert"}`
- `{"user":null}`

This library does not actually _parse_ the JSON; instead, it counts open and close braces so it can find object boundaries with minimal overhead. As long as its input is valid JSON, each of the buffers it emits will contain a valid JSON object.

## Usage

```js
const { Transform } = require("stream");
const Transformer = require("stream-transform-nested-json");

const transform = new Transformer();
const readable = Readable.from([
  Buffer.from('{"name":{'),
  Buffer.from('"first":"Adriaan"'),
  Buffer.from('}},{"name":'),
  Buffer.from('"Bert"}'),
]);
readable.pipe(transform).on("data", (chunk) => {
  console.log("=> Object:", chunk.toString());
  // Output:
  // => Object: {"name":{"first":"Adriaan"}}
  // => Object: {"name":"Bert"}
});

const transformNested = new Transformer({ nestingLevel: 1 });
const readableNested = Readable.from([
  Buffer.from('{"items":[{"name":'),
  Buffer.from('"Adriaan"},{"name"'),
  Buffer.from(':"Bert"}]}'),
]);
readableNested.pipe(transformNested).on("data", (chunk) => {
  console.log("=> Object:", chunk.toString());
  // Output:
  // => Object: {"name":"Adriaan"}
  // => Object: {"name":"Bert"}
});
```

The transformer optionally takes a single options object as an argument, which can contain the following optional properties:

- `nestingLevel`: controls how many levels of braces to "skip" when locating objects. The default is `0`, which treates the first level of braces as the objects of interest. If the input stream contains an array of objects that are nested inside another object, such as `{"items":[{...},{...}]}` then you can pass `1` here to skip the outer braces and find the ones within the array instead.

- `maxObjectSize` controls the size of an internal buffer (in bytes) used to accumulate the parts of a JSON object until the closing brace is found. Objects that consist of more bytes than this will be dropped and an error will be emitted into the output stream, so it's important to set this larger than your expected maximum object size. By default it is 8 kilobytes. Changing this value will increase or decrease the size of a chunk of memory that is allocated for the duration of the stream.

## Installation

As usual:

```
npm install --save stream-transform-nested-json
```

## License

This library may be distributed under the terms of the MIT license.
For full details, see [LICENSE](LICENSE).
