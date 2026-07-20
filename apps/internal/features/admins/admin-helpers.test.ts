import { describe, expect, it } from "vitest";
import {
  ACTIVATE_GENERIC_ERROR,
  ADMIN_ACTIVATE_SUCCESS,
  ADMIN_CREATE_SUCCESS,
  ADMIN_DEACTIVATE_SUCCESS,
  ADMIN_TYPE_LABELS,
  ADMIN_UPDATE_SUCCESS,
  buildPageStatus,
  CREATE_GENERIC_ERROR,
  CREATE_MISSING_FIELDS_ERROR,
  DEACTIVATE_CONFIRM_MESSAGE,
  DEACTIVATE_GENERIC_ERROR,
  EDIT_GENERIC_ERROR,
  EDIT_MISSING_FIELDS_ERROR,
  filterAdmins,
  getRoleBadgeVariant,
  getRoleLabel,
  validateCreateForm,
  validateEditForm,
} from "./admin-helpers";

describe("ADMIN_TYPE_LABELS", () => {
  it("maps admin / admin_doctor to user-facing labels", () => {
    expect(ADMIN_TYPE_LABELS.admin).toBe("Clinic Admin");
    expect(ADMIN_TYPE_LABELS.admin_doctor).toBe("Admin Doctor");
  });
});

describe("getRoleLabel", () => {
  it("returns Admin Doctor for ADMIN_DOCTOR", () => {
    expect(getRoleLabel("ADMIN_DOCTOR")).toBe("Admin Doctor");
  });

  it("returns Clinic Admin for any other role", () => {
    expect(getRoleLabel("ADMIN")).toBe("Clinic Admin");
    expect(getRoleLabel("DOCTOR")).toBe("Clinic Admin");
    expect(getRoleLabel("")).toBe("Clinic Admin");
  });
});

describe("getRoleBadgeVariant", () => {
  it("returns 'default' for ADMIN_DOCTOR", () => {
    expect(getRoleBadgeVariant("ADMIN_DOCTOR")).toBe("default");
  });

  it("returns 'outline' for everything else", () => {
    expect(getRoleBadgeVariant("ADMIN")).toBe("outline");
    expect(getRoleBadgeVariant("OTHER")).toBe("outline");
  });
});

describe("filterAdmins", () => {
  const admins = [
    { name: "Asha Rao", email: "asha@clinic.test" },
    { name: "Vikram Iyer", email: "vikram@clinic.test" },
    { name: "Suresh", email: "suresh@other.test" },
  ];

  it("returns all when search is empty", () => {
    expect(filterAdmins(admins, "", "clinic-1")).toHaveLength(3);
  });

  it("filters case-insensitively on name", () => {
    expect(filterAdmins(admins, "VIK", "clinic-1").map((a) => a.name)).toEqual([
      "Vikram Iyer",
    ]);
  });

  it("filters case-insensitively on email", () => {
    expect(
      filterAdmins(admins, "other.test", "clinic-1").map((a) => a.name),
    ).toEqual(["Suresh"]);
  });

  it("returns [] when nothing matches", () => {
    expect(filterAdmins(admins, "no-match", "clinic-1")).toEqual([]);
  });
});

describe("buildPageStatus", () => {
  it("returns 'loading' when loading", () => {
    expect(buildPageStatus(true, null)).toBe("loading");
  });

  it("returns 'error' when loadError is set and not loading", () => {
    expect(buildPageStatus(false, "boom")).toBe("error");
  });

  it("returns 'success' otherwise", () => {
    expect(buildPageStatus(false, null)).toBe("success");
  });
});

describe("validateCreateForm", () => {
  const valid = {
    name: "Asha",
    email: "asha@clinic.test",
    password: "secret-123",
    phoneNumber: "",
    adminType: "admin" as const,
  };

  it("returns null for a complete form", () => {
    expect(validateCreateForm(valid)).toBeNull();
  });

  it("returns the missing-fields error when name is empty", () => {
    expect(validateCreateForm({ ...valid, name: "" })).toBe(
      CREATE_MISSING_FIELDS_ERROR,
    );
  });

  it("returns the missing-fields error when email is empty", () => {
    expect(validateCreateForm({ ...valid, email: "" })).toBe(
      CREATE_MISSING_FIELDS_ERROR,
    );
  });

  it("returns the missing-fields error when password is empty", () => {
    expect(validateCreateForm({ ...valid, password: "" })).toBe(
      CREATE_MISSING_FIELDS_ERROR,
    );
  });
});

describe("validateEditForm", () => {
  const valid = {
    name: "Asha",
    email: "asha@clinic.test",
    phoneNumber: "",
    adminType: "admin" as const,
  };

  it("returns null for a complete form", () => {
    expect(validateEditForm(valid)).toBeNull();
  });

  it("returns the missing-fields error when name is empty", () => {
    expect(validateEditForm({ ...valid, name: "" })).toBe(
      EDIT_MISSING_FIELDS_ERROR,
    );
  });

  it("returns the missing-fields error when email is empty", () => {
    expect(validateEditForm({ ...valid, email: "" })).toBe(
      EDIT_MISSING_FIELDS_ERROR,
    );
  });
});

describe("message constants are non-empty and human-readable", () => {
  it.each([
    [ADMIN_CREATE_SUCCESS, /created/i],
    [ADMIN_UPDATE_SUCCESS, /updated/i],
    [ADMIN_DEACTIVATE_SUCCESS, /deactivated/i],
    [ADMIN_ACTIVATE_SUCCESS, /re-enabled/i],
    [DEACTIVATE_CONFIRM_MESSAGE, /deactivate/i],
    [CREATE_GENERIC_ERROR, /could not create/i],
    [EDIT_GENERIC_ERROR, /could not save/i],
    [DEACTIVATE_GENERIC_ERROR, /could not deactivate/i],
    [ACTIVATE_GENERIC_ERROR, /could not re-enable/i],
  ] as const)("'%s' reads as a user message", (value, pattern) => {
    expect(value).toMatch(pattern);
  });
});
