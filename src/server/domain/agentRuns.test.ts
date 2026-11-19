import { describe, expect, it } from "vitest";
import { canReportJob, nextRunStep } from "./agentRuns";

const jobs = (...statuses: Parameters<typeof nextRunStep>[1][number]["status"][]) =>
  statuses.map((status) => ({ status }));

describe("nextRunStep", () => {
  it("hands out the first queued job when nothing is in progress", () => {
    expect(nextRunStep("queued", jobs("queued", "queued"))).toEqual({ kind: "job", index: 0 });
    expect(nextRunStep("running", jobs("merged", "queued"))).toEqual({ kind: "job", index: 1 });
  });

  it("waits while a job is running, waiting for the user or being checked", () => {
    for (const active of ["running", "waiting", "checking"] as const) {
      expect(nextRunStep("running", jobs("merged", active, "queued"))).toEqual({ kind: "wait" });
    }
  });

  it("deploys once every job is merged, and only once", () => {
    expect(nextRunStep("running", jobs("merged", "merged"))).toEqual({ kind: "deploy" });
    expect(nextRunStep("deploying", jobs("merged", "merged"))).toEqual({ kind: "wait" });
  });

  it("is done when the run has finished, whatever the jobs say", () => {
    for (const finished of ["succeeded", "failed", "cancelled"] as const) {
      expect(nextRunStep(finished, jobs("queued"))).toEqual({ kind: "done" });
    }
  });

  it("never deploys after a failed job", () => {
    expect(nextRunStep("running", jobs("merged", "failed", "skipped"))).toEqual({ kind: "done" });
  });

  it("is done for a run without jobs instead of deploying nothing", () => {
    expect(nextRunStep("queued", [])).toEqual({ kind: "done" });
  });
});

describe("canReportJob", () => {
  it("lets an active job move on or report progress again (heartbeat)", () => {
    expect(canReportJob("running", "running")).toBe(true);
    expect(canReportJob("running", "waiting")).toBe(true);
    expect(canReportJob("waiting", "running")).toBe(true);
    expect(canReportJob("running", "checking")).toBe(true);
    expect(canReportJob("checking", "merged")).toBe(true);
    expect(canReportJob("checking", "failed")).toBe(true);
  });

  it("rejects reports for jobs that were never claimed or have finished", () => {
    expect(canReportJob("queued", "running")).toBe(false);
    for (const finished of ["merged", "failed", "skipped", "cancelled"] as const) {
      expect(canReportJob(finished, "running")).toBe(false);
    }
  });
});
