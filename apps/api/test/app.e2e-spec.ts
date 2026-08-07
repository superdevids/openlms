import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { GLOBAL_PREFIX } from "../src/common/constants";
import { AllExceptionsFilter } from "../src/common/filters/all-exceptions.filter";

describe("App e2e (F0-T6: request ID + error format)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(GLOBAL_PREFIX);
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/v1/health -> 200 ok", async () => {
    const res = await request(app.getHttpServer()).get(`/${GLOBAL_PREFIX}/health`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("response menyertakan header X-Request-Id (echo dari request)", async () => {
    const res = await request(app.getHttpServer())
      .get(`/${GLOBAL_PREFIX}/health`)
      .set("X-Request-Id", "req_from_client");
    expect(res.headers["x-request-id"]).toBe("req_from_client");
  });

  it("response menyertakan X-Request-Id walau client tidak mengirim", async () => {
    const res = await request(app.getHttpServer()).get(`/${GLOBAL_PREFIX}/health`);
    expect(res.headers["x-request-id"]).toMatch(/^req_/);
  });

  it("404 route -> format error standar { error: { code, message, requestId } }", async () => {
    const res = await request(app.getHttpServer()).get(`/${GLOBAL_PREFIX}/tidak-ada`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
    expect(typeof res.body.error.requestId).toBe("string");
  });
});
