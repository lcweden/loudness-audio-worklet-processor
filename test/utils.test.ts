import { describe, expect, it } from "vitest";
import { formatChannels, formatFileSize, formatSampleRate, matchesAcceptedMimeType } from "../demo/utils/index";

describe("formatFileSize", () => {
  it("formats bytes correctly", () => {
    expect(formatFileSize(512)).toBe("512.0 B");
    expect(formatFileSize(1023)).toBe("1023.0 B");
  });

  it("formats kilobytes correctly", () => {
    expect(formatFileSize(2048)).toBe("2.0 KB");
    expect(formatFileSize(1024)).toBe("1.0 KB");
    expect(formatFileSize(1536, 2)).toBe("1.50 KB");
  });

  it("formats megabytes correctly", () => {
    expect(formatFileSize(1048576)).toBe("1.0 MB");
    expect(formatFileSize(2097152, 2)).toBe("2.00 MB");
  });

  it("formats gigabytes correctly", () => {
    expect(formatFileSize(1073741824)).toBe("1.0 GB");
    expect(formatFileSize(2147483648, 2)).toBe("2.00 GB");
  });
});

describe("formatSampleRate", () => {
  it("formats sample rate in kHz", () => {
    expect(formatSampleRate(44100)).toBe("44.1 kHz");
    expect(formatSampleRate(48000)).toBe("48.0 kHz");
    expect(formatSampleRate(96000, 2)).toBe("96.00 kHz");
  });
});

describe("formatChannels", () => {
  it("returns correct channel names", () => {
    expect(formatChannels(1)).toBe("Mono");
    expect(formatChannels(2)).toBe("Stereo");
    expect(formatChannels(6)).toBe("5.1 Surround");
    expect(formatChannels(8)).toBe("7.1 Surround");
    expect(formatChannels(10)).toBe("9.1 Surround");
    expect(formatChannels(12)).toBe("11.1 Surround");
    expect(formatChannels(24)).toBe("22.2 Surround");
    expect(formatChannels(3)).toBe("3 channels");
    expect(formatChannels(16)).toBe("16 channels");
  });
});

describe("matchesAcceptedMimeType", () => {
  function mockFile(type: string): File {
    return { type } as unknown as File;
  }

  it("should return true for an exact match", () => {
    const file = mockFile("audio/wav");
    expect(matchesAcceptedMimeType("audio/wav", file)).toBe(true);
  });

  it("should return true for an exact match within a list", () => {
    const file = mockFile("audio/mpeg");
    expect(matchesAcceptedMimeType("audio/wav, audio/mpeg, audio/ogg", file)).toBe(true);
  });

  it("should return true for a generic wildcard '*'", () => {
    const file = mockFile("image/jpeg");
    expect(matchesAcceptedMimeType("*", file)).toBe(true);
  });

  it("should return true for a type wildcard like 'audio/*'", () => {
    const file = mockFile("audio/flac");
    expect(matchesAcceptedMimeType("audio/*", file)).toBe(true);
  });

  it("should return true for a type wildcard in a list", () => {
    const file = mockFile("video/mp4");
    expect(matchesAcceptedMimeType("audio/*, video/*", file)).toBe(true);
  });

  it("should return false for a non-matching type", () => {
    const file = mockFile("image/png");
    expect(matchesAcceptedMimeType("audio/wav, audio/mpeg", file)).toBe(false);
  });

  it("should return false when wildcard does not match", () => {
    const file = mockFile("image/gif");
    expect(matchesAcceptedMimeType("audio/*", file)).toBe(false);
  });

  it("should handle whitespace in accept string", () => {
    const file = mockFile("audio/wav");
    expect(matchesAcceptedMimeType(" audio/mpeg,  audio/wav ", file)).toBe(true);
  });

  it("should be case-insensitive", () => {
    const file = mockFile("audio/WAV");
    expect(matchesAcceptedMimeType("audio/wav", file)).toBe(true);
    const file2 = mockFile("AUDIO/MPEG");
    expect(matchesAcceptedMimeType("audio/*", file2)).toBe(true);
  });

  it("should return false for an empty accept string", () => {
    const file = mockFile("audio/wav");
    expect(matchesAcceptedMimeType("", file)).toBe(false);
  });

  it("should return false for a file with an empty mime type unless accept is '*'", () => {
    const file = mockFile("");
    expect(matchesAcceptedMimeType("audio/*", file)).toBe(false);
    expect(matchesAcceptedMimeType("*", file)).toBe(true);
  });
});
