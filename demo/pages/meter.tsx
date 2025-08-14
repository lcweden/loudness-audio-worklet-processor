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
          end={<button class="btn btn-sm">GitHub</button>}
        />
        <div class="flex-1">
          <pre>{JSON.stringify(getSnapshots().at(-1), null, 2)}</pre>
        </div>
      </main>
    </Drawer>
  );
}

export default Meter;
