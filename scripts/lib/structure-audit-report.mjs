function formatFinding(issue) {
  return `${issue.file}: ${issue.message}`;
}

export function printReport(title, issues, { enforce = false } = {}) {
  if (issues.length === 0) {
    console.log(`${title}: no findings.`);
    return;
  }

  console.log(`${title}: ${issues.length} finding(s).`);
  for (const issue of issues.slice(0, 80)) {
    console.log(` - ${formatFinding(issue)}`);
  }
  if (issues.length > 80) {
    console.log(` - ... ${issues.length - 80} more finding(s) omitted`);
  }

  if (enforce) {
    process.exitCode = 1;
  }
}
