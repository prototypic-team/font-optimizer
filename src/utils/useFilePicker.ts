const isFile = (entry: FileSystemEntry): entry is FileSystemFileEntry => {
  return entry.isFile;
};

const isDirectory = (
  entry: FileSystemEntry | null
): entry is FileSystemDirectoryEntry => {
  return !!entry && entry.isDirectory;
};

/** Reads only direct file children of the directory; ignores nested directories. */
function readFilesFromDirectory(dir: FileSystemEntry | null): Promise<File[]> {
  if (!isDirectory(dir)) return Promise.resolve([]);

  const reader = dir.createReader();
  const files: File[] = [];

  function read(): Promise<void> {
    return new Promise((resolve, reject) => {
      reader.readEntries(
        (entries: FileSystemEntry[]) => {
          if (entries.length === 0) {
            resolve();
            return;
          }
          Promise.all(
            entries.map((entry) => {
              if (isFile(entry)) {
                return new Promise<void>((res, rej) => {
                  entry.file((f) => {
                    files.push(f);
                    res();
                  }, rej);
                });
              }
            })
          )
            .then(() => resolve())
            .catch(reject);
        },
        (err) => reject(err ?? new Error("readEntries failed"))
      );
    });
  }

  return read().then(() => files);
}

export async function collectFilesFromDrop(
  dataTransfer: DataTransfer | null
): Promise<File[]> {
  if (!dataTransfer) return [];
  const files: File[] = [];

  for (const item of dataTransfer.items) {
    if (item.kind === "string") continue;
    const entry = item.webkitGetAsEntry();
    if (entry) {
      if (isFile(entry)) {
        const file = item.getAsFile();
        if (file) files.push(file);
      } else {
        const dirFiles = await readFilesFromDirectory(entry);
        files.push(...dirFiles);
      }
    }
  }
  return files;
}

const ALLOWED_EXTENSIONS = [".woff2", ".woff", ".ttf", ".otf"];
const ACCEPT_EXTENSIONS = ALLOWED_EXTENSIONS.join(",");
const ALLOWED_MIME_TYPES = new Set([
  "font/woff2",
  "font/woff",
  "font/ttf",
  "font/otf",
  "application/font-woff2",
  "application/font-woff",
  "application/x-font-ttf",
  "application/x-font-otf",
]);

const isFontFile = (file: File): boolean => {
  if (ALLOWED_MIME_TYPES.has(file.type)) {
    return true;
  }
  const name = file.name.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
};

const filterFontFiles = (fileList: FileList | File[] | null): File[] => {
  if (!fileList) return [];
  return Array.from(fileList).filter(isFontFile);
};

type UseFilePickerOptions = {
  onFilesSelected: (files: File[]) => void;
};

export const useFilePicker = (options: UseFilePickerOptions) => {
  const { onFilesSelected } = options;

  const handleFileList = (files: FileList | File[] | null) => {
    const fontFiles = filterFontFiles(files);
    if (fontFiles.length > 0) {
      onFilesSelected(fontFiles);
    }
  };

  const openFilePicker = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = ACCEPT_EXTENSIONS;
    input.onchange = () => {
      handleFileList(input.files);
    };
    input.click();
  };

  return { openFilePicker, handleFileList };
};
