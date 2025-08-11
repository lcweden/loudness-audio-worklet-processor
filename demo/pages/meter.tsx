import { Drawer, DrawerToggle, Navbar } from "../components";
import { AudioPanel } from "../containers";
import { SquaresIcon } from "../icons";

function Meter() {
  return (
    <Drawer sidebar={<AudioPanel />}>
      <main class="flex h-full w-full flex-col">
        <Navbar
          class="from-base-100 via-base-100 sticky top-0 bg-gradient-to-b via-80% to-transparent"
          start={
            <DrawerToggle class="btn btn-square">
              <SquaresIcon />
            </DrawerToggle>
          }
        />
        <div class="flex-1">
          <div class="h-[2000px]" />
        </div>
      </main>
    </Drawer>
  );
}

export default Meter;
