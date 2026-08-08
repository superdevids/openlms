import {
  AssignmentStatus,
  EnrollmentStatus,
  GradeType,
  MaterialType,
  SubjectCategory
} from "@prisma/client";
import {
  BulkEnrollDto,
  BulkUnenrollDto,
  UpdateEnrollmentStatusDto
} from "../classes/dto/enrollments.dto";
import { CreateClassDto, FindClassesQueryDto, UpdateClassDto } from "../classes/dto/classes.dto";
import {
  CreateClassSubjectDto,
  FindClassSubjectsQueryDto,
  UpdateClassSubjectDto
} from "../classes/dto/class-subjects.dto";
import {
  CreateScheduleDto,
  FindSchedulesQueryDto,
  UpdateScheduleDto
} from "../classes/dto/schedules.dto";
import {
  CreateSubjectDto,
  FindSubjectsQueryDto,
  UpdateSubjectDto
} from "../classes/dto/subjects.dto";
import {
  CreateMaterialDto,
  FindMaterialsQueryDto,
  RequestSignedUploadDto,
  UpdateMaterialDto
} from "../materials/dto/materials.dto";
import {
  CreateAssignmentDto,
  FindAssignmentsQueryDto,
  UpdateAssignmentDto
} from "../assignments/dto/assignments.dto";
import {
  GradeSubmissionDto,
  RequestSubmissionUploadDto,
  SubmitSubmissionDto
} from "../assignments/dto/submissions.dto";
import {
  RecordGradeDto,
  FindGradesQueryDto,
  ExportGradesDto,
  RecapStudentQueryDto
} from "../grades/dto/grades.dto";
import { expectDtoInvalid, expectDtoValid } from "../../../../test/helpers/dto-validation";

const VALID_CREATE_CLASS = { name: "XII IPA 1", gradeLevel: 12, academicYearId: "ay_1" };
const VALID_UPDATE_CLASS = { name: "XII IPA 2", gradeLevel: 11, isActive: true };
const VALID_CREATE_CS = {
  classId: "cls_1",
  subjectId: "sub_1",
  teacherId: "usr_1",
  semester: "GANJIL"
};
const VALID_UPDATE_CS = { teacherId: "usr_2", semester: "2026/2027-GANJIL" };
const VALID_CREATE_SCHEDULE = {
  classId: "cls_1",
  subjectId: "sub_1",
  teacherId: "usr_1",
  dayOfWeek: 3,
  startPeriod: 1,
  endPeriod: 2
};
const VALID_UPDATE_SCHEDULE = { dayOfWeek: 5, startPeriod: 2, endPeriod: 3 };
const VALID_CREATE_SUBJECT = { code: "MAT", name: "Matematika", category: SubjectCategory.WAJIB };
const VALID_UPDATE_SUBJECT = { name: "Matematika Lanjut", category: SubjectCategory.PILIHAN };
const VALID_BULK_ENROLL = { studentIds: ["s1", "s2"], status: EnrollmentStatus.ACTIVE };
const VALID_BULK_UNENROLL = { studentIds: ["s1", "s2"] };
const VALID_UPDATE_ENROLL = { studentId: "s1", status: EnrollmentStatus.ACTIVE };
const VALID_CREATE_MATERIAL = {
  classSubjectId: "cs_1",
  title: "Bab 1",
  type: MaterialType.DOCUMENT,
  contentUrl: "materials/uuid.pdf"
};
const VALID_UPDATE_MATERIAL = { title: "Bab 1 Revisi", type: MaterialType.VIDEO };
const VALID_SIGNED_UPLOAD = {
  filename: "soal.pdf",
  classSubjectId: "cs_1",
  contentType: "application/pdf"
};
const VALID_CREATE_ASSIGNMENT = {
  classSubjectId: "cs_1",
  title: "Tugas 1",
  dueAt: "2026-09-01T00:00:00.000Z"
};
const VALID_UPDATE_ASSIGNMENT = { title: "Tugas 1 Revisi", status: AssignmentStatus.PUBLISHED };
const VALID_SUBMIT_SUBMISSION = { content: "jawaban", attachmentUrl: "submissions/uuid.pdf" };
const VALID_GRADE_SUBMISSION = { score: 85, feedback: "Bagus" };
const VALID_SUBMISSION_UPLOAD = { filename: "tugas.pdf", assignmentId: "asg_1" };
const VALID_RECORD_GRADE = {
  studentId: "s1",
  classSubjectId: "cs_1",
  semester: "GANJIL",
  type: GradeType.TUGAS,
  score: 90
};

describe("DTO LMS", () => {
  describe("CreateClassDto", () => {
    it("input valid lolos", async () => {
      await expectDtoValid(CreateClassDto, VALID_CREATE_CLASS);
    });
    it.each([
      [{ ...VALID_CREATE_CLASS, name: "" }, "name", "isNotEmpty"],
      [{ ...VALID_CREATE_CLASS, name: undefined }, "name", "isNotEmpty"],
      [{ ...VALID_CREATE_CLASS, name: 5 }, "name", "isString"],
      [{ ...VALID_CREATE_CLASS, gradeLevel: 9 }, "gradeLevel", "min"],
      [{ ...VALID_CREATE_CLASS, gradeLevel: 13 }, "gradeLevel", "max"],
      [{ ...VALID_CREATE_CLASS, gradeLevel: 10.5 }, "gradeLevel", "isInt"],
      [{ ...VALID_CREATE_CLASS, gradeLevel: "10" }, "gradeLevel", "isInt"],
      [{ ...VALID_CREATE_CLASS, gradeLevel: undefined }, "gradeLevel", "isInt"],
      [{ ...VALID_CREATE_CLASS, academicYearId: "" }, "academicYearId", "isNotEmpty"],
      [{ ...VALID_CREATE_CLASS, academicYearId: undefined }, "academicYearId", "isNotEmpty"],
      [{ ...VALID_CREATE_CLASS, homeroomTeacherId: 99 }, "homeroomTeacherId", "isString"],
      [{ ...VALID_CREATE_CLASS, prodiId: [] }, "prodiId", "isString"]
    ])("menolak %#: %j", async (data, prop, constraint) => {
      await expectDtoInvalid(CreateClassDto, data, { property: prop, constraint });
    });
  });

  describe("UpdateClassDto", () => {
    it("input valid lolos", async () => {
      await expectDtoValid(UpdateClassDto, VALID_UPDATE_CLASS);
    });
    it("objek kosong lolos (semua opsional)", async () => {
      await expectDtoValid(UpdateClassDto, {});
    });
    it.each([
      [{ name: "" }, "name", "isNotEmpty"],
      [{ gradeLevel: 13 }, "gradeLevel", "max"],
      [{ gradeLevel: 9.5 }, "gradeLevel", "isInt"],
      [{ isActive: "yes" }, "isActive", "isBoolean"]
    ])("menolak %#: %j", async (data, prop, constraint) => {
      await expectDtoInvalid(UpdateClassDto, data, { property: prop, constraint });
    });
  });

  describe("FindClassesQueryDto", () => {
    it("gradeLevel string number ditransform lalu valid", async () => {
      await expectDtoValid(FindClassesQueryDto, { gradeLevel: "11", isActive: "true" });
    });
    it.each([
      [{ gradeLevel: "13" }, "gradeLevel", "max"],
      [{ gradeLevel: "abc" }, "gradeLevel", "isInt"],
      [{ isActive: "nope" }, "isActive", "isBoolean"]
    ])("menolak %#: %j", async (data, prop, constraint) => {
      await expectDtoInvalid(FindClassesQueryDto, data, { property: prop, constraint });
    });
  });

  describe("CreateClassSubjectDto", () => {
    it("input valid lolos", async () => {
      await expectDtoValid(CreateClassSubjectDto, VALID_CREATE_CS);
    });
    it.each([
      [{ ...VALID_CREATE_CS, classId: "" }, "classId", "isNotEmpty"],
      [{ ...VALID_CREATE_CS, subjectId: "" }, "subjectId", "isNotEmpty"],
      [{ ...VALID_CREATE_CS, teacherId: "" }, "teacherId", "isNotEmpty"],
      [{ ...VALID_CREATE_CS, semester: "ganjil" }, "semester", "matches"],
      [{ ...VALID_CREATE_CS, semester: "2026-2027-GANJIL" }, "semester", "matches"],
      [{ ...VALID_CREATE_CS, semester: "GANJIL-2026/2027" }, "semester", "matches"],
      [{ ...VALID_CREATE_CS, semester: "" }, "semester", "matches"],
      [{ ...VALID_CREATE_CS, semester: undefined }, "semester", "matches"]
    ])("menolak %#: %j", async (data, prop, constraint) => {
      await expectDtoInvalid(CreateClassSubjectDto, data, { property: prop, constraint });
    });
  });

  describe("UpdateClassSubjectDto", () => {
    it("input valid lolos", async () => {
      await expectDtoValid(UpdateClassSubjectDto, VALID_UPDATE_CS);
    });
    it.each([
      [{ semester: "GENAP-2025" }, "semester", "matches"],
      [{ classId: "" }, "classId", "isNotEmpty"]
    ])("menolak %#: %j", async (data, prop, constraint) => {
      await expectDtoInvalid(UpdateClassSubjectDto, data, { property: prop, constraint });
    });
  });

  describe("FindClassSubjectsQueryDto", () => {
    it("filter opsional diterima", async () => {
      await expectDtoValid(FindClassSubjectsQueryDto, {
        teacherId: "t1",
        classId: "c1",
        subjectId: "s1",
        semester: "GANJIL"
      });
    });
  });

  describe("CreateScheduleDto", () => {
    it("input valid lolos", async () => {
      await expectDtoValid(CreateScheduleDto, VALID_CREATE_SCHEDULE);
    });
    it.each([
      [{ ...VALID_CREATE_SCHEDULE, dayOfWeek: 0 }, "dayOfWeek", "min"],
      [{ ...VALID_CREATE_SCHEDULE, dayOfWeek: 8 }, "dayOfWeek", "max"],
      [{ ...VALID_CREATE_SCHEDULE, dayOfWeek: 1.5 }, "dayOfWeek", "isInt"],
      [{ ...VALID_CREATE_SCHEDULE, startPeriod: 0 }, "startPeriod", "min"],
      [{ ...VALID_CREATE_SCHEDULE, endPeriod: 0 }, "endPeriod", "min"],
      [{ ...VALID_CREATE_SCHEDULE, startPeriod: "1" }, "startPeriod", "isInt"],
      [{ ...VALID_CREATE_SCHEDULE, classId: "" }, "classId", "isNotEmpty"],
      [{ ...VALID_CREATE_SCHEDULE, subjectId: "" }, "subjectId", "isNotEmpty"],
      [{ ...VALID_CREATE_SCHEDULE, teacherId: "" }, "teacherId", "isNotEmpty"],
      [{ ...VALID_CREATE_SCHEDULE, room: 123 }, "room", "isString"]
    ])("menolak %#: %j", async (data, prop, constraint) => {
      await expectDtoInvalid(CreateScheduleDto, data, { property: prop, constraint });
    });
  });

  describe("UpdateScheduleDto", () => {
    it("input valid lolos", async () => {
      await expectDtoValid(UpdateScheduleDto, VALID_UPDATE_SCHEDULE);
    });
    it.each([
      [{ dayOfWeek: 8 }, "dayOfWeek", "max"],
      [{ endPeriod: 0 }, "endPeriod", "min"],
      [{ room: {} }, "room", "isString"]
    ])("menolak %#: %j", async (data, prop, constraint) => {
      await expectDtoInvalid(UpdateScheduleDto, data, { property: prop, constraint });
    });
  });

  describe("FindSchedulesQueryDto", () => {
    it("dayOfWeek string number ditransform", async () => {
      await expectDtoValid(FindSchedulesQueryDto, { dayOfWeek: "7" });
    });
    it("dayOfWeek di luar 1-7 ditolak", async () => {
      await expectDtoInvalid(
        FindSchedulesQueryDto,
        { dayOfWeek: "9" },
        { property: "dayOfWeek", constraint: "max" }
      );
    });
  });

  describe("CreateSubjectDto", () => {
    it("input valid lolos", async () => {
      await expectDtoValid(CreateSubjectDto, VALID_CREATE_SUBJECT);
    });
    it.each([
      [{ ...VALID_CREATE_SUBJECT, code: "" }, "code", "isNotEmpty"],
      [{ ...VALID_CREATE_SUBJECT, name: "" }, "name", "isNotEmpty"],
      [{ ...VALID_CREATE_SUBJECT, category: "BUKAN_KATEGORI" }, "category", "isEnum"],
      [{ ...VALID_CREATE_SUBJECT, category: undefined }, "category", "isEnum"],
      [{ ...VALID_CREATE_SUBJECT, category: 42 }, "category", "isEnum"]
    ])("menolak %#: %j", async (data, prop, constraint) => {
      await expectDtoInvalid(CreateSubjectDto, data, { property: prop, constraint });
    });
  });

  describe("UpdateSubjectDto", () => {
    it("input valid lolos", async () => {
      await expectDtoValid(UpdateSubjectDto, VALID_UPDATE_SUBJECT);
    });
    it("objek kosong lolos", async () => {
      await expectDtoValid(UpdateSubjectDto, {});
    });
    it("category tidak dikenal ditolak", async () => {
      await expectDtoInvalid(
        UpdateSubjectDto,
        { category: "X" },
        { property: "category", constraint: "isEnum" }
      );
    });
  });

  describe("FindSubjectsQueryDto", () => {
    it("category enum valid diterima", async () => {
      await expectDtoValid(FindSubjectsQueryDto, { category: SubjectCategory.KEJURUAN });
    });
    it("category invalid ditolak", async () => {
      await expectDtoInvalid(
        FindSubjectsQueryDto,
        { category: "Y" },
        { property: "category", constraint: "isEnum" }
      );
    });
  });

  describe("BulkEnrollDto", () => {
    it("input valid lolos", async () => {
      await expectDtoValid(BulkEnrollDto, VALID_BULK_ENROLL);
    });
    it.each([
      // class-validator 0.14.4: isEmpty([]) = false, jadi array kosong ditolak
      // oleh @ArrayNotEmpty() dengan constraint "arrayNotEmpty", bukan "isNotEmpty".
      [{ studentIds: [] }, "studentIds", "arrayNotEmpty"],
      [{ studentIds: [1, 2] }, "studentIds", "isString"],
      [{ studentIds: ["s1", ""] }, "studentIds", "isNotEmpty"],
      [{ studentIds: "s1" }, "studentIds", "isArray"],
      [{ ...VALID_BULK_ENROLL, status: "SALAH" }, "status", "isEnum"]
    ])("menolak %#: %j", async (data, prop, constraint) => {
      await expectDtoInvalid(BulkEnrollDto, data, { property: prop, constraint });
    });
  });

  describe("BulkUnenrollDto", () => {
    it("input valid lolos", async () => {
      await expectDtoValid(BulkUnenrollDto, VALID_BULK_UNENROLL);
    });
    it("studentIds kosong ditolak", async () => {
      // class-validator 0.14.4: array kosong -> constraint "arrayNotEmpty".
      await expectDtoInvalid(
        BulkUnenrollDto,
        { studentIds: [] },
        { property: "studentIds", constraint: "arrayNotEmpty" }
      );
    });
    it("studentIds bukan array ditolak", async () => {
      await expectDtoInvalid(
        BulkUnenrollDto,
        { studentIds: "s1" },
        { property: "studentIds", constraint: "isArray" }
      );
    });
  });

  describe("UpdateEnrollmentStatusDto", () => {
    it("input valid lolos", async () => {
      await expectDtoValid(UpdateEnrollmentStatusDto, VALID_UPDATE_ENROLL);
    });
    it.each([
      [{ ...VALID_UPDATE_ENROLL, studentId: "" }, "studentId", "isNotEmpty"],
      [{ ...VALID_UPDATE_ENROLL, status: "AKTIF" }, "status", "isEnum"],
      [{ ...VALID_UPDATE_ENROLL, status: undefined }, "status", "isEnum"]
    ])("menolak %#: %j", async (data, prop, constraint) => {
      await expectDtoInvalid(UpdateEnrollmentStatusDto, data, { property: prop, constraint });
    });
  });

  describe("CreateMaterialDto", () => {
    it("input valid lolos", async () => {
      await expectDtoValid(CreateMaterialDto, VALID_CREATE_MATERIAL);
    });
    it.each([
      [{ ...VALID_CREATE_MATERIAL, classSubjectId: "" }, "classSubjectId", "isNotEmpty"],
      [{ ...VALID_CREATE_MATERIAL, title: "" }, "title", "isNotEmpty"],
      [{ ...VALID_CREATE_MATERIAL, type: "PDF" }, "type", "isEnum"],
      [{ ...VALID_CREATE_MATERIAL, type: undefined }, "type", "isEnum"],
      [{ ...VALID_CREATE_MATERIAL, contentUrl: "" }, "contentUrl", "isNotEmpty"],
      [{ ...VALID_CREATE_MATERIAL, contentUrl: undefined }, "contentUrl", "isNotEmpty"],
      [{ ...VALID_CREATE_MATERIAL, fileSize: -1 }, "fileSize", "min"],
      [{ ...VALID_CREATE_MATERIAL, fileSize: 1.5 }, "fileSize", "isInt"]
    ])("menolak %#: %j", async (data, prop, constraint) => {
      await expectDtoInvalid(CreateMaterialDto, data, { property: prop, constraint });
    });
  });

  describe("UpdateMaterialDto", () => {
    it("input valid lolos", async () => {
      await expectDtoValid(UpdateMaterialDto, VALID_UPDATE_MATERIAL);
    });
    it("objek kosong lolos", async () => {
      await expectDtoValid(UpdateMaterialDto, {});
    });
    it("type invalid ditolak", async () => {
      await expectDtoInvalid(
        UpdateMaterialDto,
        { type: "GIF" },
        { property: "type", constraint: "isEnum" }
      );
    });
  });

  describe("FindMaterialsQueryDto", () => {
    it("isPublished boolean ditransform", async () => {
      await expectDtoValid(FindMaterialsQueryDto, { isPublished: "false" });
    });
  });

  describe("RequestSignedUploadDto", () => {
    it("input valid lolos", async () => {
      await expectDtoValid(RequestSignedUploadDto, VALID_SIGNED_UPLOAD);
    });
    it.each([
      [{ ...VALID_SIGNED_UPLOAD, filename: "" }, "filename", "isNotEmpty"],
      [{ ...VALID_SIGNED_UPLOAD, classSubjectId: "" }, "classSubjectId", "isNotEmpty"],
      [{ ...VALID_SIGNED_UPLOAD, size: -1 }, "size", "min"]
    ])("menolak %#: %j", async (data, prop, constraint) => {
      await expectDtoInvalid(RequestSignedUploadDto, data, { property: prop, constraint });
    });
  });

  describe("CreateAssignmentDto", () => {
    it("input valid lolos", async () => {
      await expectDtoValid(CreateAssignmentDto, VALID_CREATE_ASSIGNMENT);
    });
    it.each([
      [{ ...VALID_CREATE_ASSIGNMENT, classSubjectId: "" }, "classSubjectId", "isNotEmpty"],
      [{ ...VALID_CREATE_ASSIGNMENT, title: "" }, "title", "isNotEmpty"],
      [{ ...VALID_CREATE_ASSIGNMENT, dueAt: "bukan-tanggal" }, "dueAt", "isDateString"],
      [{ ...VALID_CREATE_ASSIGNMENT, dueAt: undefined }, "dueAt", "isDateString"],
      [{ ...VALID_CREATE_ASSIGNMENT, dueAt: 20260901 }, "dueAt", "isDateString"],
      [{ ...VALID_CREATE_ASSIGNMENT, maxScore: 0 }, "maxScore", "min"],
      [{ ...VALID_CREATE_ASSIGNMENT, maxScore: 10001 }, "maxScore", "max"],
      [{ ...VALID_CREATE_ASSIGNMENT, maxScore: 80.5 }, "maxScore", "isInt"],
      [{ ...VALID_CREATE_ASSIGNMENT, allowLate: "ya" }, "allowLate", "isBoolean"],
      [{ ...VALID_CREATE_ASSIGNMENT, status: "BUKAN" }, "status", "isEnum"]
    ])("menolak %#: %j", async (data, prop, constraint) => {
      await expectDtoInvalid(CreateAssignmentDto, data, { property: prop, constraint });
    });
  });

  describe("UpdateAssignmentDto", () => {
    it("input valid lolos", async () => {
      await expectDtoValid(UpdateAssignmentDto, VALID_UPDATE_ASSIGNMENT);
    });
    it.each([
      [{ dueAt: "x" }, "dueAt", "isDateString"],
      [{ maxScore: 20000 }, "maxScore", "max"]
    ])("menolak %#: %j", async (data, prop, constraint) => {
      await expectDtoInvalid(UpdateAssignmentDto, data, { property: prop, constraint });
    });
  });

  describe("FindAssignmentsQueryDto", () => {
    it("status enum valid diterima", async () => {
      await expectDtoValid(FindAssignmentsQueryDto, { status: AssignmentStatus.CLOSED });
    });
    it("status invalid ditolak", async () => {
      await expectDtoInvalid(
        FindAssignmentsQueryDto,
        { status: "HAPUS" },
        { property: "status", constraint: "isEnum" }
      );
    });
  });

  describe("SubmitSubmissionDto", () => {
    it("input valid lolos", async () => {
      await expectDtoValid(SubmitSubmissionDto, VALID_SUBMIT_SUBMISSION);
    });
    it("objek kosong lolos (content/attachment opsional)", async () => {
      await expectDtoValid(SubmitSubmissionDto, {});
    });
    it("content bukan string ditolak", async () => {
      await expectDtoInvalid(
        SubmitSubmissionDto,
        { content: 123 },
        { property: "content", constraint: "isString" }
      );
    });
  });

  describe("GradeSubmissionDto", () => {
    it("input valid lolos", async () => {
      await expectDtoValid(GradeSubmissionDto, VALID_GRADE_SUBMISSION);
    });
    it.each([
      [{ score: -1 }, "score", "min"],
      [{ score: 10001 }, "score", "max"],
      [{ score: 50.5 }, "score", "isInt"],
      [{ score: undefined }, "score", "isInt"],
      [{ score: "90" }, "score", "isInt"]
    ])("menolak %#: %j", async (data, prop, constraint) => {
      await expectDtoInvalid(GradeSubmissionDto, data, { property: prop, constraint });
    });
  });

  describe("RequestSubmissionUploadDto", () => {
    it("input valid lolos", async () => {
      await expectDtoValid(RequestSubmissionUploadDto, VALID_SUBMISSION_UPLOAD);
    });
    it("filename kosong ditolak", async () => {
      await expectDtoInvalid(
        RequestSubmissionUploadDto,
        { ...VALID_SUBMISSION_UPLOAD, filename: "" },
        { property: "filename", constraint: "isNotEmpty" }
      );
    });
  });

  describe("RecordGradeDto", () => {
    it("input valid lolos", async () => {
      await expectDtoValid(RecordGradeDto, VALID_RECORD_GRADE);
    });
    it.each([
      [{ ...VALID_RECORD_GRADE, studentId: "" }, "studentId", "isNotEmpty"],
      [{ ...VALID_RECORD_GRADE, classSubjectId: "" }, "classSubjectId", "isNotEmpty"],
      [{ ...VALID_RECORD_GRADE, semester: "" }, "semester", "isNotEmpty"],
      [{ ...VALID_RECORD_GRADE, type: "PR" }, "type", "isEnum"],
      [{ ...VALID_RECORD_GRADE, type: undefined }, "type", "isEnum"],
      [{ ...VALID_RECORD_GRADE, score: -1 }, "score", "min"],
      [{ ...VALID_RECORD_GRADE, score: 10001 }, "score", "max"],
      [{ ...VALID_RECORD_GRADE, score: 90.5 }, "score", "isInt"],
      [{ ...VALID_RECORD_GRADE, weight: 0 }, "weight", "min"]
    ])("menolak %#: %j", async (data, prop, constraint) => {
      await expectDtoInvalid(RecordGradeDto, data, { property: prop, constraint });
    });
  });

  describe("FindGradesQueryDto / RecapStudentQueryDto / ExportGradesDto", () => {
    it("filter opsional diterima", async () => {
      await expectDtoValid(FindGradesQueryDto, {
        studentId: "s1",
        semester: "GENAP",
        type: GradeType.SUMATIF
      });
    });
    it("type invalid ditolak", async () => {
      await expectDtoInvalid(
        FindGradesQueryDto,
        { type: "UAS" },
        { property: "type", constraint: "isEnum" }
      );
    });
    it("RecapStudentQueryDto semester diterima", async () => {
      await expectDtoValid(RecapStudentQueryDto, { classSubjectId: "cs_1", semester: "GANJIL" });
    });
    it("ExportGradesDto semua opsional", async () => {
      await expectDtoValid(ExportGradesDto, { classId: "c1", studentId: "s1", semester: "GANJIL" });
    });
  });
});
