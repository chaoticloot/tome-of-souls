import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import { defineConfig, loadEnv } from "vite";

function gitLastCommitDate(relPath: string): string {
  try {
    const out = execSync(
      `git log -1 --format=%cI -- "${relPath}"`,
      { encoding: "utf-8", cwd: path.resolve(__dirname) },
    ).trim();
    return out || "";
  } catch {
    return "";
  }
}

function characterPlugin() {
  const virtualModuleId = "virtual:characters";
  const resolvedVirtualModuleId = "\0" + virtualModuleId;

  return {
    name: "character-plugin",
    resolveId(id: string) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId;
      }
    },
    load(id: string) {
      if (id === resolvedVirtualModuleId) {
        const charactersDir = path.resolve(__dirname, "public/characters");
        const characters: {
          filename: string;
          id: string;
          name: string;
          folder: string;
          updatedAt: string;
        }[] = [];

        const collectFiles = (dir: string, folder: string) => {
          let entries: fs.Dirent[] = [];
          try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
          } catch (e) {
            console.warn("Could not read characters folder");
            return;
          }

          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              collectFiles(fullPath, folder || entry.name);
            } else if (entry.isFile() && entry.name.endsWith(".json")) {
              const id = path
                .relative(charactersDir, fullPath)
                .replace(/\.json$/, "")
                .split(path.sep)
                .join("/");
              const stat = fs.statSync(fullPath);
              let charName = entry.name.replace(".json", "");
              try {
                const data = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
                if (data.name) charName = data.name;
              } catch (e) {}

              const gitRel = path.relative(path.resolve(__dirname), fullPath);
              const fromGit = gitLastCommitDate(gitRel);

              characters.push({
                filename: entry.name,
                id,
                name: charName,
                folder: folder || "Misc",
                updatedAt: fromGit || stat.mtime.toISOString(),
              });
            }
          }
        };

        collectFiles(charactersDir, "");
        characters.sort((a, b) => {
          if (a.folder === "Misc" && b.folder !== "Misc") return 1;
          if (b.folder === "Misc" && a.folder !== "Misc") return -1;
          const folderCmp = a.folder.localeCompare(b.folder, "en");
          if (folderCmp !== 0) return folderCmp;
          return a.name.localeCompare(b.name, "en");
        });

        return `export const characters = ${JSON.stringify(characters)};`;
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    base: "./",
    plugins: [react(), tailwindcss(), characterPlugin()],
    define: {
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== "true",
    },
  };
});
