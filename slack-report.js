require("dotenv").config();
const https = require("https");
const fs = require("fs");
const { URL } = require("url");

const resultPath = "result.json";
const webhookUrl = process.env.SLACK_WEBHOOK_URL;

if (!webhookUrl) {
    console.error("❌ SLACK_WEBHOOK_URL is not defined");
    process.exit(1);
}

if (!fs.existsSync(resultPath)) {
    console.error(`❌ ${resultPath} not found`);
    process.exit(1);
}

const data = JSON.parse(fs.readFileSync(resultPath, "utf8"));
const run = data.run;
const stats = run.stats;
const executions = run.executions;

// ---------- SUMMARY ----------
const summaryAttachment = {
    fallback: "Postman Collection Run Summary",
    color: stats.assertions.failed > 0 ? "#ff0000" : "#36a64f",
    title: "📊 Postman Collection Run Completed",
    text:
        `• Requests: ${stats.requests.total}\n` +
        `• Assertions: ${stats.assertions.total}\n` +
        `• Failed Assertions: ${stats.assertions.failed}\n` +
        `• Time: ${new Date().toLocaleString()}`
};

// ---------- PER-REQUEST DETAILS ----------
const requestAttachments = executions.map(exec => {
    const name = exec.item?.name || "Unnamed Request";
    const method = exec.request?.method || "N/A";
    const code = exec.response?.code ?? "N/A";

    const assertions = exec.assertions || [];
    const failedAssertions = assertions.filter(a => a.error);

    const passed = failedAssertions.length === 0;

    const text = passed
        ? "All assertions passed ✅"
        : failedAssertions
            .map(a => `• ${a.assertion}: ${a.error.message}`)
            .join("\n");

    return {
        fallback: `${name} - ${passed ? "Passed" : "Failed"}`,
        color: passed ? "#36a64f" : "#ff0000",
        title: `${passed ? "✅" : "❌"} ${name} [${method}] (Status: ${code})`,
        text
    };
});

// ---------- PAYLOAD ----------
const payload = JSON.stringify({
    attachments: [summaryAttachment, ...requestAttachments]
});

const url = new URL(webhookUrl);

const options = {
    hostname: url.hostname,
    path: url.pathname,
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload)
    }
};

const req = https.request(options, res => {
    let body = "";
    res.on("data", chunk => (body += chunk));
    res.on("end", () => {
        if (res.statusCode >= 400) {
            console.error("❌ Slack API error:", res.statusCode, body);
            process.exit(1);
        }
        console.log("✅ Slack report sent successfully");
    });
});

req.on("error", err => {
    console.error("❌ Slack request failed:", err.message);
    process.exit(1);
});

req.write(payload);
req.end();
