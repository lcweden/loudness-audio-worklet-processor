import { createMemo, createSignal } from "solid-js";

function createPagination<T>(data?: T[], options?: { pageSize: number }) {
  const [getData, setData] = createSignal<T[]>(data || []);
  const [getPageSize, setPageSize] = createSignal<number>(options?.pageSize || 10);
  const [getCurrentPage, setCurrentPage] = createSignal<number>(1);

  const getTotalPages = createMemo<number>(() => {
    const data = getData();
    const pageSize = getPageSize();

    if (!data || !pageSize) {
      throw new Error("Pagination data or pageSize not set");
    }

    return Math.max(1, Math.ceil(data.length / pageSize));
  });

  const getPageData = createMemo(() => {
    const data = getData();
    const pageSize = getPageSize();
    const currentPage = getCurrentPage();

    if (!data || !pageSize) {
      throw new Error("Pagination data or pageSize not set");
    }

    const start = (currentPage - 1) * pageSize;

    return data.slice(start, start + pageSize);
  });

  function first() {
    if (getCurrentPage() !== 1) {
      return setCurrentPage(1);
    }
  }

  function last() {
    if (getCurrentPage() !== getTotalPages()) {
      return setCurrentPage(getTotalPages());
    }
  }

  function prev() {
    if (getCurrentPage() !== 1) {
      return setCurrentPage(getCurrentPage() - 1);
    }
  }

  function next() {
    if (getCurrentPage() !== getTotalPages()) {
      return setCurrentPage(getCurrentPage() + 1);
    }
  }

  return {
    setData,
    getCurrentPage,
    setCurrentPage,
    getPageSize,
    setPageSize,
    getTotalPages,
    getPageData,
    first,
    last,
    prev,
    next
  };
}

export { createPagination };
