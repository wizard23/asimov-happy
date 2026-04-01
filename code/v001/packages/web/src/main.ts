import { hello } from "@asimov/minimal-shared";


const el = document.getElementById("app");
if (!el) throw new Error("#app not found");

el.textContent = `(from web): ${hello("world")}` + " ";