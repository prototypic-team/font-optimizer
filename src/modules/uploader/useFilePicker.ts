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

const filterFontFiles = (fileList: FileList | null): File[] => {
  if (!fileList) return [];
  return Array.from(fileList).filter(isFontFile);
};

type UseFilePickerOptions = {
  onFilesSelected: (files: File[]) => void;
};

export const useFilePicker = (options: UseFilePickerOptions) => {
  const { onFilesSelected } = options;

  const handleFileList = (fileList: FileList | null) => {
    const fontFiles = filterFontFiles(fileList);
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
