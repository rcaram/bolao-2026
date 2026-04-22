import request from "supertest";
import app from "./app";


// Mock the db pool so it doesn't try to connect during tests
jest.mock("@workspace/db", () => ({
  pool: {
    query: jest.fn(),
    end: jest.fn(),
  },
  db: {},
}));

describe("App", () => {
  it("should be defined", () => {
    expect(app).toBeDefined();
  });

  it("should respond to health check", async () => {
    const response = await request(app).get("/api/healthz");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });
});
