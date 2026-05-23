import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const rootDirectory = process.cwd();
const outputDirectory = path.join(rootDirectory, "dist", "github-pages");

await rm(outputDirectory, {
  recursive: true,
  force: true
});

await mkdir(outputDirectory, {
  recursive: true
});

await cp(path.join(rootDirectory, "frontend"), outputDirectory, {
  recursive: true
});

await cp(path.join(rootDirectory, "layers expression"), path.join(outputDirectory, "layers"), {
  recursive: true
});
