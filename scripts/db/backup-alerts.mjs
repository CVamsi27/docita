import { createEnvironmentReader } from "./backup-environment.mjs";

export function backupAlertConfiguration(Failure) {
  const { required } = createEnvironmentReader(Failure);
  const provider = process.env.BACKUP_MONITOR_ALERT_PROVIDER ?? "webhook";
  if (!["webhook", "zeptomail"].includes(provider))
    throw new Failure("unsupported backup alert provider");
  const url = new URL(
    required(
      provider === "webhook"
        ? "BACKUP_MONITOR_ALERT_WEBHOOK_URL"
        : "BACKUP_MONITOR_EMAIL_API_URL",
    ),
  );
  const local =
    url.protocol === "http:" && ["127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    (!local && url.protocol !== "https:") ||
    url.username ||
    url.password ||
    url.hash
  )
    throw new Failure("alert destination must use HTTPS");
  if (provider === "webhook") return { provider, url };
  if (url.search || url.pathname !== "/v1.1/email")
    throw new Failure("invalid email API endpoint");
  const address = (name) => {
    const value = required(name);
    if (
      value.length > 254 ||
      !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,63}$/.test(
        value,
      )
    )
      throw new Failure(`${name} must contain one explicit email address`);
    return value;
  };
  return {
    provider,
    url,
    token: required("BACKUP_MONITOR_EMAIL_TOKEN"),
    from: address("BACKUP_MONITOR_EMAIL_FROM"),
    to: address("BACKUP_MONITOR_ALERT_EMAIL_TO"),
  };
}

export async function sendBackupAlert(config, reason, test = false) {
  try {
    const subject = `${test ? "[TEST]" : "[PAGE]"} Docita backup alert`;
    const text = test
      ? "Authorized synthetic backup alert test. This message contains no patient data. Production backups are not activated by this test. Confirm receipt with the operator."
      : `Docita database backup: ${reason}. Operator review required.`;
    const email = config.provider === "zeptomail";
    const token =
      email &&
      (/^Zoho-enczapikey\s+/i.test(config.token)
        ? config.token
        : `Zoho-enczapikey ${config.token}`);
    const response = await fetch(config.url, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(5000),
      headers: {
        "Content-Type": "application/json",
        ...(email ? { Authorization: token } : {}),
      },
      body: JSON.stringify(
        email
          ? {
              from: { address: config.from },
              to: [{ email_address: { address: config.to } }],
              subject,
              textbody: text,
              track_opens: false,
              track_clicks: false,
            }
          : { text: `${subject}: ${text}` },
      ),
    });
    if (!response.ok || !email) {
      await response.body?.cancel();
      return response.ok;
    }
    const chunks = [];
    let size = 0;
    for await (const chunk of response.body ?? []) {
      size += chunk.length;
      if (size > 16384) {
        await response.body.cancel().catch(() => {});
        return false;
      }
      chunks.push(chunk);
    }
    const payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    return (
      payload !== null &&
      typeof payload === "object" &&
      !payload.error &&
      Array.isArray(payload.data) &&
      payload.data.length === 1 &&
      payload.data[0]?.code === "EM_104" &&
      typeof payload.request_id === "string" &&
      payload.request_id.length > 0
    );
  } catch {
    // A timed-out POST may have been accepted; do not retry an uncertain send.
    return false;
  }
}
