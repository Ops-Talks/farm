import { SnakeNamingStrategy } from "./snake-naming.strategy";

describe("SnakeNamingStrategy", () => {
  const strategy = new SnakeNamingStrategy();

  describe("tableName", () => {
    it("converts the class name to snake_case when no custom name is given", () => {
      expect(strategy.tableName("UserProfile", undefined)).toBe("user_profile");
    });

    it("returns the custom name verbatim when provided", () => {
      expect(strategy.tableName("UserProfile", "custom_table")).toBe(
        "custom_table",
      );
    });
  });

  describe("columnName", () => {
    it("converts the property name to snake_case when no custom name and no embedded prefixes are given", () => {
      expect(strategy.columnName("firstName", undefined, [])).toBe(
        "first_name",
      );
    });

    it("returns the custom name verbatim when provided", () => {
      expect(strategy.columnName("firstName", "custom_column", [])).toBe(
        "custom_column",
      );
    });

    it("joins a single embedded prefix with the property name before snake_casing", () => {
      expect(strategy.columnName("street", undefined, ["address"])).toBe(
        "address_street",
      );
    });

    it("joins multiple embedded prefixes with the property name before snake_casing", () => {
      expect(
        strategy.columnName("zipCode", undefined, ["homeAddress", "billing"]),
      ).toBe("home_address_billing_zip_code");
    });

    it("defaults embeddedPrefixes to an empty array when omitted", () => {
      expect(strategy.columnName("lastName", undefined)).toBe("last_name");
    });
  });

  describe("relationName", () => {
    it("converts the property name to snake_case", () => {
      expect(strategy.relationName("teamMembers")).toBe("team_members");
    });
  });

  describe("joinColumnName", () => {
    it("joins the relation name and referenced column name and snake_cases the result", () => {
      expect(strategy.joinColumnName("teamMember", "userId")).toBe(
        "team_member_user_id",
      );
    });
  });

  describe("joinTableName", () => {
    it("joins both table names and snake_cases the result", () => {
      expect(strategy.joinTableName("incident", "component")).toBe(
        "incident_component",
      );
    });
  });

  describe("joinTableColumnName", () => {
    it("joins the table name with the property name when no custom column name is given", () => {
      expect(
        strategy.joinTableColumnName("incident", "componentId", undefined),
      ).toBe("incident_component_id");
    });

    it("joins the table name with the custom column name when provided", () => {
      expect(
        strategy.joinTableColumnName("incident", "componentId", "custom_id"),
      ).toBe("incident_custom_id");
    });
  });
});
