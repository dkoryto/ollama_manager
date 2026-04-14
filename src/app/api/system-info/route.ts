import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";

const execAsync = promisify(exec);

function readFile(path: string): string | null {
  try {
    return fs.readFileSync(path, "utf8").trim();
  } catch {
    return null;
  }
}

async function getTemperatures(): Promise<number[]> {
  const temps: number[] = [];
  try {
    const zones = fs.readdirSync("/sys/class/thermal").filter((d) => d.startsWith("thermal_zone"));
    for (const zone of zones) {
      const temp = readFile(`/sys/class/thermal/${zone}/temp`);
      if (temp) {
        const t = parseInt(temp, 10);
        if (!isNaN(t) && t > 0) {
          temps.push(t > 1000 ? t / 1000 : t);
        }
      }
    }
  } catch {
    // ignore
  }
  try {
    const hwmons = fs.readdirSync("/sys/class/hwmon");
    for (const hwmon of hwmons) {
      const path = `/sys/class/hwmon/${hwmon}`;
      const files = fs.readdirSync(path);
      for (const file of files) {
        if (file.match(/^temp\d+_input$/)) {
          const temp = readFile(`${path}/${file}`);
          if (temp) {
            const t = parseInt(temp, 10);
            if (!isNaN(t) && t > 0) {
              temps.push(t > 1000 ? t / 1000 : t);
            }
          }
        }
      }
    }
  } catch {
    // ignore
  }
  if (temps.length === 0) {
    try {
      const { stdout } = await execAsync("osascript -e 'do shell script \"powermetrics --samplers smc -n 1 | grep 'CPU die temperature'\"'");
      const match = stdout.match(/(\d+(?:\.\d+)?)/);
      if (match) temps.push(parseFloat(match[1]));
    } catch {
      // ignore
    }
  }
  return temps;
}

async function getMemory(): Promise<{ totalMb: number; freeMb: number; usedMb: number } | null> {
  try {
    const data = readFile("/proc/meminfo");
    if (!data) return null;
    const totalMatch = data.match(/MemTotal:\s+(\d+)/);
    const availMatch = data.match(/MemAvailable:\s+(\d+)/);
    if (totalMatch && availMatch) {
      const total = parseInt(totalMatch[1], 10) / 1024;
      const avail = parseInt(availMatch[1], 10) / 1024;
      return { totalMb: Math.round(total), freeMb: Math.round(avail), usedMb: Math.round(total - avail) };
    }
  } catch {
    // ignore
  }
  return null;
}

export async function GET() {
  const [temps, memory] = await Promise.all([getTemperatures(), getMemory()]);
  const maxTemp = temps.length > 0 ? Math.max(...temps) : null;
  return NextResponse.json({
    temperature: maxTemp,
    temperatures: temps,
    memory,
  });
}
