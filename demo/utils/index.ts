function formatFileSize(size: number, digits: number = 1): string {
  if (size < 1024) {
    return size.toFixed(digits) + " B";
  } else if (size < 1024 * 1024) {
    return (size / 1024).toFixed(digits) + " KB";
  } else if (size < 1024 * 1024 * 1024) {
    return (size / 1024 / 1024).toFixed(digits) + " MB";
  } else {
    return (size / 1024 / 1024 / 1024).toFixed(digits) + " GB";
  }
}

function formatSampleRate(sampleRate: number, digits: number = 1): string {
  return (sampleRate / 1000).toFixed(digits) + " kHz";
}

function formatChannels(count: number): string {
  switch (count) {
    case 1:
      return "Mono";
    case 2:
      return "Stereo";
    case 6:
      return "5.1 Surround";
    case 8:
      return "7.1 Surround";
    case 10:
      return "9.1 Surround";
    case 12:
      return "11.1 Surround";
    case 24:
      return "22.2 Surround";
    default:
      return `${count} channels`;
  }
}

export { formatChannels, formatFileSize, formatSampleRate };
