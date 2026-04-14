import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export type GpuInfo = {
  totalMb: number;
  usedMb: number;
  freeMb: number;
  source: "nvidia-smi" | "none";
};

export async function GET() {
  try {
    const { stdout } = await execAsync(
      "nvidia-smi --query-gpu=memory.total,memory.used --format=csv,noheader,nounits"
    );
    const lines = stdout.trim().split("\n");
    let total = 0;
    let used = 0;
    for (const line of lines) {
      const [t, u] = line.split(",").map((s) => parseInt(s.trim(), 10));
      if (!isNaN(t)) total += t;
      if (!isNaN(u)) used += u;
    }
    return NextResponse.json({
      totalMb: total,
      usedMb: used,
      freeMb: total - used,
      source: "nvidia-smi",
    });
  } catch {
    return NextResponse.json({
      totalMb: 0,
      usedMb: 0,
      freeMb: 0,
      source: "none",
    });
  }
}
