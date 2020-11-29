const { Transform, Readable } = require("stream");
const Transformer = require("stream-transform-nested-json");

describe("TransformNestedJSON", () => {
  it("emits complete json objects", async () => {
    const transform = new Transformer();
    const readable = Readable.from([
      Buffer.from('{"name":{'),
      Buffer.from('"first":"Adriaan"'),
      Buffer.from('}},{"name":'),
      Buffer.from('"Bert"}'),
    ]);

    const onData = jest.fn();

    await new Promise((res, rej) =>
      readable
        .pipe(transform)
        .on("data", onData)
        .on("error", rej)
        .on("end", res)
    );

    expect(onData).toHaveBeenCalledTimes(2);
    const [call1, call2] = onData.mock.calls;

    expect(call1[0].toString()).toBe(
      JSON.stringify({ name: { first: "Adriaan" } })
    );
    expect(call2[0].toString()).toBe(JSON.stringify({ name: "Bert" }));
  });

  describe("nestingLevel option", () => {
    it("picks deeper objects in tree", async () => {
      const transformNested = new Transformer({ nestingLevel: 1 });
      const readableNested = Readable.from([
        Buffer.from('{"items":[{"name":'),
        Buffer.from('"Adriaan"},{"name"'),
        Buffer.from(':"Bert"}]}'),
      ]);
      const onData = jest.fn();

      await new Promise((res, rej) =>
        readableNested
          .pipe(transformNested)
          .on("data", onData)
          .on("error", rej)
          .on("end", res)
      );

      expect(onData).toHaveBeenCalledTimes(2);
      const [call1, call2] = onData.mock.calls;

      expect(call1[0].toString()).toBe(JSON.stringify({ name: "Adriaan" }));
      expect(call2[0].toString()).toBe(JSON.stringify({ name: "Bert" }));
    });
  });

  describe("special characters", () => {
    it("should allow backslashes", async () => {
      const transform = new Transformer();
      const readable = Readable.from([
        Buffer.from('{"name":'),
        Buffer.from('"\\"'),
        Buffer.from('},{"name":'),
        Buffer.from('"Bert"}'),
      ]);
      const onData = jest.fn();

      await new Promise((res, rej) =>
        readable
          .pipe(transform)
          .on("data", onData)
          .on("error", rej)
          .on("end", res)
      );

      expect(onData).toHaveBeenCalledTimes(2);
      const [call1, call2] = onData.mock.calls;

      expect(call1[0].toString()).toBe(JSON.stringify({ name: "\\" }));
      expect(call2[0].toString()).toBe(JSON.stringify({ name: "Bert" }));
    });
  });
});
