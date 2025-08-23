import { A } from "@solidjs/router";
import { repository, version } from "../../package.json" with { type: "json" };
import githubIcon from "../assets/github-mark-white.svg?url";

function Home() {
  return (
    <div class="hero bg-base-100 min-h-screen">
      <div class="hero-content text-center">
        <div class="flex max-w-xl flex-col items-center gap-12">
          <a
            class="btn btn-ghost btn-sm rounded-full text-sm font-light shadow"
            href="/loudness.worklet.js"
            download="loudness.worklet.js"
          >
            Download Javascript File
            <div class="badge badge-neutral badge-soft badge-sm rounded-full tabular-nums">v{version}</div>
          </a>
          <h1 class="text-6xl font-semibold tracking-tight text-balance">Loudness Meter</h1>
          <p class="text-base-content/50 text-lg font-medium text-pretty">
            Anim aute id magna aliqua ad ad non deserunt sunt. Qui irure qui lorem cupidatat commodo. Elit sunt amet
            fugiat veniam occaecat.
          </p>
          <div class="flex items-center justify-center gap-1">
            <a class="btn btn-neutral space-x-1" href={repository.url} target="_blank">
              <img class="size-4" src={githubIcon} alt="GitHub" />
              <span>View on GitHub</span>
            </a>
            <A href="/meter" class="btn btn-ghost">
              Try Demo
            </A>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
