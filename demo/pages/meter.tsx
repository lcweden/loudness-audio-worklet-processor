import { repository } from "../../package.json" with { type: "json" };
import githubIcon from "../assets/github-mark-white.svg?url";
import { Drawer, DrawerToggle, Navbar } from "../components";
import { AudioPanel } from "../containers";
import { createLoudnessContext } from "../contexts";
import { SquaresIcon } from "../icons";

function Meter() {
  const [getSnapshots] = createLoudnessContext();

  return (
    <Drawer sidebar={<AudioPanel />}>
      <main class="flex h-full w-full flex-col">
        <Navbar
          class="from-base-100 via-base-100 sticky top-0 bg-gradient-to-b via-80% to-transparent"
          start={
            <DrawerToggle class="btn btn-square btn-sm">
              <SquaresIcon />
            </DrawerToggle>
          }
          center={<button class="btn btn-sm btn-ghost lg:hidden">Loudness Meter</button>}
          end={
            <a class="btn btn-neutral btn-sm btn-square" href={repository.url} target="_blank">
              <img class="size-5" src={githubIcon} alt="GitHub" />
            </a>
          }
        />
        <div class="flex-1">
          <pre>{JSON.stringify(getSnapshots().at(-1), null, 2)}</pre>
        </div>
      </main>
    </Drawer>
  );
}

export default Meter;
