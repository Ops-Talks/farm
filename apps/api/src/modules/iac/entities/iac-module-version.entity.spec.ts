import { IacModuleVersion } from "./iac-module-version.entity";

const makeVersion = (
  overrides: Partial<IacModuleVersion> = {},
): IacModuleVersion => {
  const v = new IacModuleVersion();
  v.id = "ver-uuid-1";
  v.version = "v1.0.0";
  v.variablesMeta = null;
  v.outputsMeta = null;
  Object.assign(v, overrides);
  return v;
};

describe("IacModuleVersion", () => {
  describe("getParsedVariables", () => {
    it("returns an empty array when variablesMeta is null", () => {
      const v = makeVersion({ variablesMeta: null as unknown as string });
      expect(v.getParsedVariables()).toEqual([]);
    });

    it("returns parsed variables from valid JSON", () => {
      const vars = [
        {
          name: "region",
          type: "string",
          description: "AWS region",
          required: true,
        },
      ];
      const v = makeVersion({ variablesMeta: JSON.stringify(vars) });
      expect(v.getParsedVariables()).toEqual(vars);
    });

    it("returns an empty array when variablesMeta is invalid JSON", () => {
      const v = makeVersion({ variablesMeta: "not-valid-json{" });
      expect(v.getParsedVariables()).toEqual([]);
    });

    it("returns the array directly when variablesMeta is already a parsed array", () => {
      const vars = [
        {
          name: "region",
          type: "string",
          description: null,
          required: true,
          default: null,
          validation: null,
        },
      ];
      const v = makeVersion({ variablesMeta: vars });
      expect(v.getParsedVariables()).toEqual(vars);
    });
  });

  describe("getParsedOutputs", () => {
    it("returns an empty array when outputsMeta is null", () => {
      const v = makeVersion({ outputsMeta: null as unknown as string });
      expect(v.getParsedOutputs()).toEqual([]);
    });

    it("returns parsed outputs from valid JSON", () => {
      const outs = [{ name: "bucket_arn", description: "The ARN" }];
      const v = makeVersion({ outputsMeta: JSON.stringify(outs) });
      expect(v.getParsedOutputs()).toEqual(outs);
    });

    it("returns an empty array when outputsMeta is invalid JSON", () => {
      const v = makeVersion({ outputsMeta: "[broken" });
      expect(v.getParsedOutputs()).toEqual([]);
    });

    it("returns the array directly when outputsMeta is already a parsed array", () => {
      const outs = [
        { name: "bucket_arn", description: "The ARN", value: null },
      ];
      const v = makeVersion({ outputsMeta: outs });
      expect(v.getParsedOutputs()).toEqual(outs);
    });
  });
});
