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
        <div class="max-w-md">
          <h1 class="text-5xl font-bold">Hello there</h1>
          <p class="py-6">
            Provident cupiditate voluptatem et in. Quaerat fugiat ut assumenda excepturi exercitationem quasi. In
            deleniti eaque aut repudiandae et a id nisi.
          </p>
          <div class="flex justify-center gap-1">
            <FileSelector class="btn btn-wide btn-primary" onchange={handleFileSelect} accept="*audio, *video" />
            <a class="btn btn-square btn-neutral">
              <img class="w-6" src="/logos/github-mark-white.svg" alt="Github" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export { HeroPage };
