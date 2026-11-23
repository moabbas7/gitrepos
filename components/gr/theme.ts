export const THEME_STORAGE_KEY = "gr-theme";

/**
 * Runs synchronously in <head> before first paint. Dark is the default;
 * only an explicit saved choice of "light" switches theme. Storage access can
 * throw (private mode, blocked site data), so it is wrapped in try/catch.
 * `?theme=light|dark` in the URL overrides for that view (handy for review links) without saving.
 */
export const THEME_INIT_SCRIPT = `(function(){var t=null;try{t=new URLSearchParams(location.search).get("theme")}catch(e){}if(t!=="light"&&t!=="dark"){try{t=localStorage.getItem("${THEME_STORAGE_KEY}")}catch(e){}}if(t==="light"){document.documentElement.setAttribute("data-theme","light")}})();`;
