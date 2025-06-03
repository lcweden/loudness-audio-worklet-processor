import { createSignal, Show } from 'solid-js';
import { MeterPage } from './pages';
import { HeroPage } from './pages/hero-page';

function App() {
  const [getSelectedFile, setSelectedFile] = createSignal<File>();

  return (
    <Show when={getSelectedFile()} fallback={<HeroPage setFile={setSelectedFile} />}>
      <MeterPage getFile={getSelectedFile} setFile={setSelectedFile} />
    </Show>
  );
}

export { App };
