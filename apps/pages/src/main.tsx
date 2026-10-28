import { RemoteConnection } from "../../web/src/components/RemoteConnection";
import { createRoot } from "react-dom/client";
import { RecipeBook } from "../../web/src/components/RecipeBook";
import "../../web/src/app/globals.css";

createRoot(document.getElementById("root")!).render(<RemoteConnection><RecipeBook /></RemoteConnection>);
