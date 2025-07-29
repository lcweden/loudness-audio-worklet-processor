import { mergeProps, Setter } from "solid-js";
import { FileSelector } from "../components";
import { PlusIcon } from "../icons";

type HeroPageProps = {
  setFile: Setter<File | undefined>;
};

function HeroPage(heroPageProps: HeroPageProps) {
  const { setFile } = mergeProps(heroPageProps);

  function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files as FileList;

    if (files.length > 0) {
      setFile(files[0]);
    }
  }

  return (
    <div class="hero font-urbanist h-dvh">
      <div class="hero-content text-center">
        <div class="max-w-md space-y-6">
          <a
            class="btn btn-sm rounded-full font-light tracking-wide shadow"
            href="loudness.worklet.js"
            download="loudness.worklet.js"
          >
            Download JS File
          </a>
          <h1 class="text-5xl font-bold">Loudness Meter</h1>
          <p class="text-base-content/50 font-mono">
            Real-time audio loudness analysis in browser, following ITU-R BS.1770-5.
          </p>
          <div class="flex w-full flex-col items-center gap-2">
            <div class="flex w-full justify-center gap-1">
              <FileSelector class="btn btn-wide btn-primary" onchange={handleFileSelect} accept="audio/*, video/*">
                <p class="flex items-center gap-2 font-sans">
                  <PlusIcon />
                  Select File
                </p>
              </FileSelector>
              <a
                class="btn btn-square btn-neutral"
                href="https://github.com/lcweden/loudness-audio-worklet-processor"
                target="_blank"
                rel="noopener noreferrer external"
              >
                <img class="w-6" src="./logos/github-mark-white.svg" alt="Github" />
              </a>
            </div>
            <p class="text-xs text-gray-400">Select an audio or video file to analyze loudness locally.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export { HeroPage };
