import { spawn } from "node:child_process";
import type { CredentialEncryption } from "@rezeptbuch/chatgpt-local";

function crypt(value: Uint8Array, protect: boolean): Promise<Buffer> {
  if (process.platform !== "win32") throw new Error("Der Abo-Test benötigt Windows-Verschlüsselung. Keine Klartextspeicherung.");
  const script = `Add-Type -AssemblyName System.Security; $bytes=[Convert]::FromBase64String([Console]::In.ReadToEnd()); $result=[Security.Cryptography.ProtectedData]::${protect ? "Protect" : "Unprotect"}($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write([Convert]::ToBase64String($result))`;
  return new Promise((resolve, reject) => {
    const child = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
    let output = "";
    const timer = setTimeout(() => { child.kill(); reject(new Error("Windows-Verschlüsselung hat nicht geantwortet.")); }, 30000);
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (part) => { output += part; if (output.length > 6000000) { child.kill(); reject(new Error("Verschlüsselungsausgabe zu groß.")); } });
    child.stderr.resume();
    child.on("error", () => { clearTimeout(timer); reject(new Error("Windows-Verschlüsselung nicht verfügbar.")); });
    child.on("exit", (code) => { clearTimeout(timer); if (code !== 0 || !/^[A-Za-z0-9+/=]*$/.test(output.trim())) reject(new Error("Windows-Verschlüsselung fehlgeschlagen.")); else resolve(Buffer.from(output.trim(), "base64")); });
    child.stdin.on("error", () => {});
    child.stdin.end(Buffer.from(value).toString("base64"));
  });
}
export const windowsEncryption: CredentialEncryption = {
  id: "windows-dpapi-currentuser-v1", isAvailable: () => process.platform === "win32",
  encrypt: (text) => crypt(Buffer.from(text, "utf8"), true), decrypt: async (bytes) => (await crypt(bytes, false)).toString("utf8"),
};
