import pc from "picocolors";

function rule(): string {
  return pc.dim("\u2500".repeat(50));
}

export function formatStats(
  files: number,
  insertions: number,
  deletions: number,
): void {
  console.log(pc.dim(`  Files: ${files}   +${insertions} / -${deletions}`));
}

export function formatComprehensive(text: string): void {
  console.log();
  console.log(pc.bold(pc.cyan("  Change Analysis")));
  console.log(rule());
  console.log();

  const raw = text;

  const sections = raw.split(/(?=^### )/m);

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    const headingMatch = trimmed.match(/^### (.+)$/m);
    const heading = headingMatch ? headingMatch[1] : "";

    const body = trimmed
      .replace(/^### .+/m, "")
      .trim();

    let color = pc.cyan;
    let icon = "\u2139"; // ℹ

    if (/summary/i.test(heading)) {
      color = pc.cyan;
      icon = "\uD83D\uDCCC"; // 📌
    } else if (/why/i.test(heading)) {
      color = pc.yellow;
      icon = "\uD83C\uDFAF"; // 🎯
    } else if (/regression/i.test(heading)) {
      color = pc.red;
      icon = "\u26A0\uFE0F"; // ⚠️
    } else if (/affected/i.test(heading)) {
      color = pc.magenta;
      icon = "\uD83D\uDD17"; // 🔗
    } else if (/commit/i.test(heading)) {
      color = pc.green;
      icon = "\uD83D\uDCBE"; // 💡
    } else if (/pr/i.test(heading) || /description/i.test(heading)) {
      color = pc.blue;
      icon = "\uD83D\uDCDD"; // 📄
    } else if (/test/i.test(heading)) {
      color = pc.green;
      icon = "\uD83E\uDDEA"; // 🧪
    }

    if (heading) {
      console.log(`  ${icon}  ${pc.bold(heading)}`);
      console.log();
    }

    for (const line of body.split("\n")) {
      if (line.trim()) {
        console.log(`    ${line}`);
      } else {
        console.log();
      }
    }
    console.log();
  }
}

export function formatRiskAnalysis(text: string): void {
  const level = text.match(
    /\*\*Risk Level\*\*.*?(Low|Medium|High|Critical)/i,
  )?.[1]?.toLowerCase();
  const color =
    level === "high" || level === "critical" ? pc.red : pc.yellow;

  console.log();
  console.log(pc.bold(color("  Risk Analysis")));
  console.log(rule());
  console.log();
  console.log(text);
  console.log();
}

export function formatCommitMessage(text: string): void {
  console.log();
  console.log(pc.bold(pc.green("  Suggested Commit Message")));
  console.log(rule());
  console.log();
  console.log(text);
  console.log();
}

export function formatError(msg: string): void {
  console.error(pc.red(`Error: ${msg}`));
}
