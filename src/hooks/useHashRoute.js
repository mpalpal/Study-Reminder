import { useEffect, useState } from "react";

/** URL の #review などから、表示中のページ名を返す。該当しなければ先頭のページ。 */
export function useHashRoute(pageIds) {
  const readPage = () => {
    const id = window.location.hash.slice(1);
    return pageIds.includes(id) ? id : pageIds[0];
  };
  const [page, setPage] = useState(readPage);

  useEffect(() => {
    const onHashChange = () => setPage(readPage());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []); // pageIds は App 側の定数なので、登録は最初の1回だけでよい

  return page;
}
