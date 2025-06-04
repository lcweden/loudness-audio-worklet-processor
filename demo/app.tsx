import { createSignal, lazy, Show, Suspense } from 'solid-js';

const MeterPage = lazy(() => import('./pages').then((m) => ({ default: m.MeterPage })));
const HeroPage = lazy(() => import('./pages').then((m) => ({ default: m.HeroPage })));

function App() {
  const [getSelectedFile, setSelectedFile] = createSignal<File>();

  return (
    <Show when={getSelectedFile()} fallback={<HeroPage setFile={setSelectedFile} />}>
      <Suspense fallback={<div>Loading...</div>}>
        <MeterPage getFile={getSelectedFile} setFile={setSelectedFile} />
      </Suspense>
    </Show>
  );
}

export { App };
