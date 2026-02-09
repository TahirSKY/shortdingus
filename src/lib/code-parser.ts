export interface ParsedFile {
  filename: string;
  content: string;
}

const FILE_MARKER_REGEX = /^\/\/\s*---\s*file:\s*(.+?)\s*---\s*$/;

export function parseMultiFileCode(code: string): ParsedFile[] {
  const lines = code.split("\n");
  const files: ParsedFile[] = [];
  let currentFile: ParsedFile | null = null;

  for (const line of lines) {
    const match = line.match(FILE_MARKER_REGEX);
    if (match) {
      if (currentFile) {
        currentFile.content = currentFile.content.trimEnd();
        files.push(currentFile);
      }
      currentFile = { filename: match[1].trim(), content: "" };
    } else if (currentFile) {
      currentFile.content += line + "\n";
    }
  }

  if (currentFile) {
    currentFile.content = currentFile.content.trimEnd();
    files.push(currentFile);
  }

  // If no markers found, treat entire code as a single component
  if (files.length === 0 && code.trim()) {
    files.push({ filename: "MyVideo.tsx", content: code.trim() });
  }

  return files;
}
