import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.resolve(__dirname, "../EQUIPE_DATA5.md");

if (!fs.existsSync(filePath)) {
  console.error(`[Watcher] Arquivo não encontrado: ${filePath}`);
  process.exit(1);
}

console.log("\n=======================================================");
console.log("  📡 Data5 Agent Watcher — Monitorando EQUIPE_DATA5.md");
console.log("=======================================================");
console.log(`Arquivo: ${filePath}`);
console.log("Aguardando atualizações em tempo real...\n");

let lastSize = fs.statSync(filePath).size;
let lastContent = fs.readFileSync(filePath, "utf-8");

function tocarBeep() {
  // Emite beep sonoro no Windows via powershell
  if (process.platform === "win32") {
    exec('powershell -c "[console]::beep(800, 250); [console]::beep(1100, 300)"', () => {});
  } else {
    process.stdout.write("\u0007");
  }
}

fs.watchFile(filePath, { interval: 1000 }, (curr, prev) => {
  if (curr.size !== prev.size) {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      if (content.length > lastContent.length) {
        const addedText = content.slice(lastContent.length);
        
        // Tenta achar cabeçalho do novo post: ## [Agente] — [data] — [assunto]
        const matchHeader = addedText.match(/##\s*([^\n]+)/);
        const header = matchHeader ? matchHeader[1].trim() : "Nova atualização no arquivo";

        tocarBeep();

        console.log("\n" + "=".repeat(60));
        console.log("🔔 [NOVA MENSAGEM DETECTADA DA EQUIPE DATA5]");
        console.log(`📌 Cabeçalho: ${header}`);
        console.log("-".repeat(60));
        
        const preview = addedText
          .split("\n")
          .filter((l) => l.trim().length > 0)
          .slice(0, 6)
          .join("\n");
        console.log(preview);
        console.log("-".repeat(60));
        console.log("💡 Dica para os agentes: 'leia o EQUIPE_DATA5.md'");
        console.log("=".repeat(60) + "\n");
      }
      lastContent = content;
      lastSize = curr.size;
    } catch (err) {
      console.error("[Watcher] Erro ao ler alteração:", err.message);
    }
  }
});
