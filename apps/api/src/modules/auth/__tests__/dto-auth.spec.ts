import { ROLE_VALUES } from "@opensis/types";
import { AcceptInvitationDto } from "../dto/accept-invitation.dto";
import { ChangePasswordDto } from "../dto/change-password.dto";
import { InvitationDto } from "../dto/invitation.dto";
import { LoginDto } from "../dto/login.dto";
import { ResetPasswordDto } from "../dto/reset-password.dto";
import { expectDtoInvalid, expectDtoValid } from "../../../../test/helpers/dto-validation";

const VALID_LOGIN = { emailOrUsername: "admin@sekolah.sch.id", password: "rahasia123" };
const VALID_CHANGE_PW = { currentPassword: "lama1234", newPassword: "baru12345" };
const VALID_RESET_PW = { userId: "usr_1", newPassword: "sementara1" };
const VALID_INVITATION = { email: "guru@sekolah.sch.id", fullName: "Budi Santoso", role: "GURU" };
const VALID_ACCEPT = { token: "inv_tok_abc" };

describe("DTO Auth", () => {
  describe("LoginDto", () => {
    it("input valid lolos validasi", async () => {
      await expectDtoValid(LoginDto, VALID_LOGIN);
    });

    it.each([
      [{ ...VALID_LOGIN, emailOrUsername: undefined }, "emailOrUsername", "isNotEmpty"],
      [{ ...VALID_LOGIN, emailOrUsername: "" }, "emailOrUsername", "isNotEmpty"],
      [{ ...VALID_LOGIN, emailOrUsername: 123 }, "emailOrUsername", "isString"],
      [{ ...VALID_LOGIN, password: undefined }, "password", "isNotEmpty"],
      [{ ...VALID_LOGIN, password: "" }, "password", "isNotEmpty"],
      [{ ...VALID_LOGIN, password: null }, "password", "isString"],
      [{ ...VALID_LOGIN, password: ["x"] }, "password", "isString"],
      [{}, "emailOrUsername", "isNotEmpty"]
    ])("menolak input %#: %j", async (data, prop, constraint) => {
      await expectDtoInvalid(LoginDto, data, { property: prop, constraint });
    });
  });

  describe("ChangePasswordDto", () => {
    it("input valid lolos validasi", async () => {
      await expectDtoValid(ChangePasswordDto, VALID_CHANGE_PW);
    });

    it.each([
      [{ ...VALID_CHANGE_PW, currentPassword: "" }, "currentPassword", "isNotEmpty"],
      [{ ...VALID_CHANGE_PW, currentPassword: undefined }, "currentPassword", "isNotEmpty"],
      [{ ...VALID_CHANGE_PW, currentPassword: 9 }, "currentPassword", "isString"],
      [{ ...VALID_CHANGE_PW, newPassword: "" }, "newPassword", "isLength"],
      [{ ...VALID_CHANGE_PW, newPassword: "1234567" }, "newPassword", "isLength"],
      [{ ...VALID_CHANGE_PW, newPassword: "x".repeat(129) }, "newPassword", "isLength"],
      [{ ...VALID_CHANGE_PW, newPassword: undefined }, "newPassword", "isString"]
    ])("menolak input %#: %j", async (data, prop, constraint) => {
      await expectDtoInvalid(ChangePasswordDto, data, { property: prop, constraint });
    });
  });

  describe("ResetPasswordDto", () => {
    it("input valid lolos validasi", async () => {
      await expectDtoValid(ResetPasswordDto, VALID_RESET_PW);
    });

    it("newPassword opsional", async () => {
      await expectDtoValid(ResetPasswordDto, { userId: "usr_1" });
    });

    it.each([
      [{ ...VALID_RESET_PW, userId: "" }, "userId", "isNotEmpty"],
      [{ ...VALID_RESET_PW, userId: undefined }, "userId", "isNotEmpty"],
      [{ ...VALID_RESET_PW, newPassword: "pendek1" }, "newPassword", "isLength"],
      [{ ...VALID_RESET_PW, newPassword: 42 }, "newPassword", "isString"]
    ])("menolak input %#: %j", async (data, prop, constraint) => {
      await expectDtoInvalid(ResetPasswordDto, data, { property: prop, constraint });
    });
  });

  describe("InvitationDto", () => {
    it("input valid lolos validasi", async () => {
      await expectDtoValid(InvitationDto, VALID_INVITATION);
    });

    it("role setiap nilai ROLE_VALUES diterima", async () => {
      for (const role of ROLE_VALUES) {
        await expectDtoValid(InvitationDto, { fullName: "Orang", role });
      }
    });

    it("username tanpa email diterima", async () => {
      await expectDtoValid(InvitationDto, {
        username: "budi.guru",
        fullName: "Budi",
        role: "GURU"
      });
    });

    it.each([
      [{ ...VALID_INVITATION, email: "bukan-email" }, "email", "isEmail"],
      [{ ...VALID_INVITATION, email: 123 }, "email", "isEmail"],
      [{ ...VALID_INVITATION, fullName: "" }, "fullName", "isNotEmpty"],
      [{ ...VALID_INVITATION, fullName: undefined }, "fullName", "isNotEmpty"],
      [{ ...VALID_INVITATION, role: "TIDAK_ADA" }, "role", "isIn"],
      [{ ...VALID_INVITATION, role: undefined }, "role", "isIn"],
      [{ ...VALID_INVITATION, role: "" }, "role", "isIn"]
    ])("menolak input %#: %j", async (data, prop, constraint) => {
      await expectDtoInvalid(InvitationDto, data, { property: prop, constraint });
    });
  });

  describe("AcceptInvitationDto", () => {
    it("input valid lolos validasi", async () => {
      await expectDtoValid(AcceptInvitationDto, VALID_ACCEPT);
    });

    it.each([
      [{ token: "" }, "token", "isNotEmpty"],
      [{ token: undefined }, "token", "isNotEmpty"],
      [{ token: 42 }, "token", "isString"],
      [{}, "token", "isNotEmpty"]
    ])("menolak input %#: %j", async (data, prop, constraint) => {
      await expectDtoInvalid(AcceptInvitationDto, data, { property: prop, constraint });
    });
  });
});
