import { mergeProps, Setter } from 'solid-js';
import { FileSelector } from '../components';

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
    <div class="hero h-dvh">
      <div class="hero-content text-center">
        <div class="max-w-md space-y-4">
          <a class="btn btn-sm rounded-full font-light tracking-wide shadow">Download JS File</a>
          <h1 class="text-5xl font-bold">Loudness Meter</h1>
          <p>
            Real-time audio loudness analysis for the Web.
            <br />
            ITU-R BS.1770-5 compliant. Open source. Easy integration.
          </p>
          <div class="flex justify-center gap-1">
            <FileSelector class="btn btn-wide btn-primary" onchange={handleFileSelect} accept="audio/*, video/*" />
            <a class="btn btn-square btn-neutral">
              <img class="w-6" src="/logos/github-mark-white.svg" alt="Github" />
            </a>
          </div>
          <p class="text-xs text-gray-400">Select an audio or video file to analyze loudness locally.</p>
        </div>
      </div>
    </div>
  );
}

export { HeroPage };
